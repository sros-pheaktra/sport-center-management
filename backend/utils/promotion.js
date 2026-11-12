
// Promotion lookup/validation shared by the booking flow and the
// /api/promotions/validate preview endpoint. Discounts are always
// recalculated on the server; the browser only previews them.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const normalizeCode = (value) =>
    String(value || '').trim().toUpperCase()

const isValidDateString = (value) => {
    if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false

    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    )
}

const roundMoney = (value) => Math.round(value * 100) / 100

const findPromotionByCode = async (executor, code, { forUpdate = false } = {}) => {
    const cleanCode = normalizeCode(code)

    if (!cleanCode) return null

    const [rows] = await executor.query(
        `SELECT id, code, title, description, discount_type, discount_value,
                valid_from, valid_until, usage_limit, used_count, is_active
         FROM promotions
         WHERE code = ?
         ${forUpdate ? 'FOR UPDATE' : ''}`,
        [cleanCode]
    )

    return rows[0] || null
}

// Checks dates, activation and the usage limit, then returns the
// discount for the amount it is applied to. Errors are friendly
// messages safe to send to the client.
const evaluatePromotion = (promotion, { bookingDate, baseAmount }) => {
    if (!promotion) {
        return { error: 'Promotion code not found' }
    }

    if (!promotion.is_active) {
        return { error: 'This promotion is no longer active' }
    }

    if (!isValidDateString(bookingDate)) {
        return { error: 'Please choose a valid booking date' }
    }

    const from = String(promotion.valid_from).slice(0, 10)
    const until = String(promotion.valid_until).slice(0, 10)

    if (bookingDate < from || bookingDate > until) {
        return { error: `This promotion is only valid from ${from} to ${until}` }
    }

    if (
        promotion.usage_limit !== null &&
        Number(promotion.used_count) >= Number(promotion.usage_limit)
    ) {
        return { error: 'This promotion has reached its usage limit' }
    }

    const amount = Math.max(0, Number(baseAmount) || 0)
    const value = Number(promotion.discount_value)

    const discount = promotion.discount_type === 'percent'
        ? roundMoney(amount * (value / 100))
        : roundMoney(Math.min(value, amount))

    return { promotion, discount: Math.max(0, discount) }
}

// Frees a promotion slot when a booking is cancelled/refunded.
const releasePromotion = async (executor, promotionId) => {
    if (!promotionId) return

    await executor.query(
        `UPDATE promotions
         SET used_count = GREATEST(used_count - 1, 0)
         WHERE id = ?`,
        [promotionId]
    )
}

module.exports = {
    normalizeCode,
    isValidDateString,
    findPromotionByCode,
    evaluatePromotion,
    releasePromotion
}
