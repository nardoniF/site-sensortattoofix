const inFlightByOrder = new Map();

function isDefinitiveSuperfreteRejection(error) {
  return /Super Frete (?:400|401|402|403|404|409|422|429):/i.test(String(error?.message || error || ''));
}

async function runLocked(orderId, operation) {
  const key = String(orderId || '').trim();
  if (!key) throw new Error('Pedido sem identificador; carrinho Super Frete não foi criado.');
  const active = inFlightByOrder.get(key);
  if (active) return active;

  const pending = Promise.resolve().then(operation);
  inFlightByOrder.set(key, pending);
  try {
    return await pending;
  } finally {
    if (inFlightByOrder.get(key) === pending) inFlightByOrder.delete(key);
  }
}

export async function runSuperfreteCartAction({
  orderId,
  refreshExisting = false,
  loadOrder,
  loadClaim,
  claimCreation,
  findByOrderReference = async () => null,
  createCart,
  getCart,
  persistCartId,
  saveOrder,
  completeClaim,
  releaseClaim,
  applyRemoteCart
}) {
  return runLocked(orderId, async () => {
    const order = await loadOrder(orderId);
    if (!order) throw new Error('Pedido não encontrado; carrinho Super Frete não foi criado.');

    let claim = order.superfreteCartId ? null : await loadClaim(orderId);
    let cartId = order.superfreteCartId || claim?.cartId || null;

    if (!cartId && claim?.state === 'creating') {
      throw new Error(
        'A criação do carrinho deste pedido já foi iniciada, mas o ID ainda não foi confirmado. '
        + 'Nenhum novo carrinho foi criado; confira o painel Super Frete antes de tentar novamente.'
      );
    }

    if (!cartId) {
      const acquired = await claimCreation(orderId);
      if (!acquired) {
        claim = await loadClaim(orderId);
        cartId = claim?.cartId || null;
        if (!cartId) {
          throw new Error(
            'Já existe uma preparação de carrinho em andamento para este pedido. '
            + 'Nenhum novo carrinho foi criado.'
          );
        }
      } else {
        try {
          const existing = await findByOrderReference(orderId, order);
          const created = existing || await createCart(order);
          if (created?.skipped) {
            await releaseClaim(orderId);
            return created;
          }
          cartId = String(created?.id || '').trim();
          if (!cartId) throw new Error('Super Frete não retornou o ID do carrinho; nenhum novo carrinho será tentado automaticamente.');

          try {
            await persistCartId(orderId, cartId);
          } catch (error) {
            throw new Error(
              `Carrinho ${cartId} foi criado na Super Frete, mas não foi possível registrar seu ID. `
              + 'A criação foi bloqueada para evitar duplicidade; confira o painel Super Frete. '
              + `Detalhe ao salvar o ID: ${error?.message || error}`
            );
          }

          order.superfreteCartId = cartId;
          order.superfreteCartStatus = 'pending';
          try {
            await saveOrder(order);
          } catch (error) {
            throw new Error(
              `Carrinho ${cartId} foi registrado para recuperação, mas não foi possível salvar o ID no pedido. `
              + 'A criação foi bloqueada para evitar duplicidade; corrija o armazenamento e confira o painel Super Frete. '
              + `Detalhe: ${error?.message || error}`
            );
          }

          if (created?.orderFields && typeof created.orderFields === 'object') {
            Object.assign(order, created.orderFields);
          }
          if (created?.price != null) order.superfreteCartPrice = created.price;
          order.superfreteCartAt = new Date().toISOString();
          order.superfreteCartError = null;
          try {
            await saveOrder(order);
          } catch (error) {
            throw new Error(
              `Carrinho ${cartId} e seu ID foram salvos, mas não foi possível salvar os demais dados do pedido. `
              + 'Nenhum outro carrinho será criado; atualize o pedido e confira o painel Super Frete. '
              + `Detalhe: ${error?.message || error}`
            );
          }
          await completeClaim(orderId, cartId);
          return {
            cartId,
            status: 'pending',
            tracking: null,
            openUrl: 'https://web.superfrete.com/#/minhas-etiquetas',
            created: true
          };
        } catch (error) {
          if (isDefinitiveSuperfreteRejection(error) || error?.superfreteDefinitelyNotCreated === true) {
            try {
              await releaseClaim(orderId);
            } catch (releaseError) {
              throw new Error(
                `${error?.message || error} `
                + `(também falhou liberar o lock do pedido: ${releaseError?.message || releaseError})`
              );
            }
          }
          throw error;
        }
      }
    }

    if (cartId && !order.superfreteCartId) {
      order.superfreteCartId = cartId;
      order.superfreteCartStatus = 'pending';
      await saveOrder(order);
    }

    if (!refreshExisting) {
      return {
        cartId,
        status: order.superfreteCartStatus || 'pending',
        tracking: order.superfreteTrackingCode || order.correiosTrackingCode || null,
        openUrl: 'https://web.superfrete.com/#/minhas-etiquetas',
        created: false
      };
    }

    const remote = await getCart(cartId);
    await applyRemoteCart(order, remote);
    await saveOrder(order);
    return {
      cartId,
      status: order.superfreteCartStatus || 'pending',
      tracking: order.superfreteTrackingCode || order.correiosTrackingCode || null,
      openUrl: 'https://web.superfrete.com/#/minhas-etiquetas',
      created: false
    };
  });
}
