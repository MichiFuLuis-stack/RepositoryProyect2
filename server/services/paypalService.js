/**
 * DocPlant 🌱 - Servicio de PayPal
 * 
 * Integración con PayPal para pagos de membresía Premium.
 * Actualmente en modo sandbox/mock. 
 * 
 * ============================================
 * GUÍA PARA ACTIVAR MODO PRODUCCIÓN (LIVE):
 * ============================================
 * 1. Crear una cuenta de desarrollador en https://developer.paypal.com
 * 2. Crear una aplicación REST API en el Dashboard
 * 3. Obtener Client ID y Secret del modo LIVE
 * 4. Actualizar en .env:
 *    - PAYPAL_CLIENT_ID=<tu_live_client_id>
 *    - PAYPAL_CLIENT_SECRET=<tu_live_secret>
 *    - PAYPAL_MODE=live
 * 5. La URL base cambiará automáticamente a api-m.paypal.com
 * 6. Implementar los endpoints reales descomentando el código marcado
 * ============================================
 */

const config = require('../config/config');
const { generateInvoiceNumber } = require('../utils/helpers');

/**
 * Obtener token de acceso de PayPal (para modo live)
 * @returns {string} Token de acceso
 */
async function getAccessToken() {
  // === MODO SANDBOX: Retornar token mock ===
  if (config.paypal.mode === 'sandbox') {
    return 'SANDBOX_ACCESS_TOKEN_MOCK';
  }

  // === MODO LIVE: Descomentar para producción ===
  /*
  const auth = Buffer.from(
    `${config.paypal.clientId}:${config.paypal.clientSecret}`
  ).toString('base64');

  const response = await fetch(`${config.paypal.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`PayPal auth error: ${data.error_description || 'Unknown error'}`);
  }

  return data.access_token;
  */
}

/**
 * Crear una orden de pago en PayPal
 * @param {number} amount - Monto a cobrar
 * @param {string} description - Descripción del pago
 * @param {string} currency - Moneda (default: USD)
 * @returns {Object} Datos de la orden creada
 */
async function createOrder(amount, description = 'DocPlant Premium', currency = 'USD') {
  // === MODO SANDBOX: Retornar datos mock ===
  if (config.paypal.mode === 'sandbox') {
    const mockOrderId = `MOCK-ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      order: {
        id: mockOrderId,
        status: 'CREATED',
        amount: amount,
        currency: currency,
        description: description,
        created_at: new Date().toISOString(),
        approval_url: `https://www.sandbox.paypal.com/checkoutnow?token=${mockOrderId}`,
        links: [
          {
            href: `https://api.sandbox.paypal.com/v2/checkout/orders/${mockOrderId}`,
            rel: 'self',
            method: 'GET'
          },
          {
            href: `https://www.sandbox.paypal.com/checkoutnow?token=${mockOrderId}`,
            rel: 'approve',
            method: 'GET'
          },
          {
            href: `https://api.sandbox.paypal.com/v2/checkout/orders/${mockOrderId}/capture`,
            rel: 'capture',
            method: 'POST'
          }
        ]
      },
      sandbox: true,
      message: 'Orden sandbox creada. En producción, se redirigirá a PayPal para el pago.'
    };
  }

  // === MODO LIVE: Descomentar para producción ===
  /*
  const accessToken = await getAccessToken();

  const orderData = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: currency,
        value: amount.toFixed(2)
      },
      description: description
    }],
    application_context: {
      brand_name: 'DocPlant',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: `${config.appUrl}/payment/success`,
      cancel_url: `${config.appUrl}/payment/cancel`
    }
  };

  const response = await fetch(`${config.paypal.baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`PayPal create order error: ${data.message || 'Unknown error'}`);
  }

  const approvalUrl = data.links.find(link => link.rel === 'approve')?.href;

  return {
    success: true,
    order: {
      id: data.id,
      status: data.status,
      amount: amount,
      currency: currency,
      approval_url: approvalUrl,
      links: data.links
    }
  };
  */
}

/**
 * Capturar el pago de una orden
 * @param {string} orderId - ID de la orden de PayPal
 * @returns {Object} Resultado de la captura
 */
async function captureOrder(orderId) {
  // === MODO SANDBOX: Retornar datos mock ===
  if (config.paypal.mode === 'sandbox') {
    return {
      success: true,
      capture: {
        id: orderId,
        status: 'COMPLETED',
        payer: {
          email_address: 'sandbox-buyer@docplant.com',
          name: {
            given_name: 'Usuario',
            surname: 'Sandbox'
          },
          payer_id: 'SANDBOX_PAYER_ID'
        },
        purchase_units: [{
          payments: {
            captures: [{
              id: `CAPTURE-${Date.now()}`,
              status: 'COMPLETED',
              amount: {
                currency_code: 'USD',
                value: config.pricing.premium.monthly.toFixed(2)
              }
            }]
          }
        }],
        captured_at: new Date().toISOString()
      },
      sandbox: true,
      message: 'Pago sandbox capturado exitosamente.'
    };
  }

  // === MODO LIVE: Descomentar para producción ===
  /*
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${config.paypal.baseUrl}/v2/checkout/orders/${orderId}/capture`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`PayPal capture error: ${data.message || 'Unknown error'}`);
  }

  return {
    success: true,
    capture: {
      id: data.id,
      status: data.status,
      payer: data.payer,
      purchase_units: data.purchase_units,
      captured_at: new Date().toISOString()
    }
  };
  */
}

/**
 * Obtener detalles de una orden
 * @param {string} orderId - ID de la orden
 * @returns {Object} Detalles de la orden
 */
async function getOrderDetails(orderId) {
  // === MODO SANDBOX: Retornar datos mock ===
  if (config.paypal.mode === 'sandbox') {
    return {
      success: true,
      order: {
        id: orderId,
        status: 'COMPLETED',
        intent: 'CAPTURE',
        payer: {
          email_address: 'sandbox-buyer@docplant.com',
          name: { given_name: 'Usuario', surname: 'Sandbox' }
        },
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: config.pricing.premium.monthly.toFixed(2)
          },
          description: 'DocPlant Premium - Mensual'
        }],
        create_time: new Date(Date.now() - 3600000).toISOString(),
        update_time: new Date().toISOString()
      },
      sandbox: true
    };
  }

  // === MODO LIVE: Descomentar para producción ===
  /*
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${config.paypal.baseUrl}/v2/checkout/orders/${orderId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`PayPal get order error: ${data.message || 'Unknown error'}`);
  }

  return { success: true, order: data };
  */
}

/**
 * Obtener información de precios
 * @returns {Object} Planes y precios
 */
function getPricing() {
  return {
    plans: [
      {
        id: 'free',
        name: 'Gratuito',
        price: 0,
        currency: 'USD',
        features: [
          `${config.uploads.dailyLimitFree} subidas diarias`,
          `Archivos hasta ${(config.files.maxSizeFree / 1024 / 1024).toFixed(0)} MB`,
          'Generación de documentos DOCX',
          'Vista previa de documentos',
          'Archivos disponibles 24 horas'
        ],
        limitations: [
          'Sin soporte prioritario',
          'Sin almacenamiento permanente'
        ]
      },
      {
        id: 'premium_monthly',
        name: 'Premium Mensual',
        price: config.pricing.premium.monthly,
        currency: 'USD',
        period: 'month',
        features: [
          'Subidas ilimitadas',
          `Archivos hasta ${(config.files.maxSizePremium / 1024 / 1024).toFixed(0)} MB`,
          'Generación de documentos DOCX y PDF',
          'Vista previa de documentos',
          'Archivos disponibles 72 horas',
          'Soporte prioritario',
          'Historial de documentos'
        ],
        popular: true
      },
      {
        id: 'premium_yearly',
        name: 'Premium Anual',
        price: config.pricing.premium.yearly,
        currency: 'USD',
        period: 'year',
        features: [
          'Todo lo del plan Premium Mensual',
          'Ahorra un 17% vs mensual',
          'Soporte VIP'
        ],
        savings: ((config.pricing.premium.monthly * 12) - config.pricing.premium.yearly).toFixed(2)
      }
    ]
  };
}

module.exports = {
  createOrder,
  captureOrder,
  getOrderDetails,
  getAccessToken,
  getPricing
};
