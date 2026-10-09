// Keep the public withdrawal endpoint delegated to the single canonical handler.
// The previous duplicate implementation calculated a different available balance
// than the dashboard and could reject a valid withdrawal (e.g. R$100 with R$110 shown).
module.exports = require('../_handlers/affiliate_withdraw');
