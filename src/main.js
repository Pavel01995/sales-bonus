function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const decimalDiscount = discount / 100;
    const totalBeforeDiscount = sale_price * quantity;
    return totalBeforeDiscount * (1 - decimalDiscount);
}

function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.1;
    } else if (index === total - 1) {
        return 0;
    } else {
        return profit * 0.05;
    }
}

function analyzeSalesData(data, options) {
    if (
        !data ||
        !Array.isArray(data.purchase_records) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.sellers)
    ) {
        throw new Error("Некорректные входные данные");
    }

    const { calculateRevenue, calculateBonus } = options || {};
    if (typeof calculateRevenue !== "function" || typeof calculateBonus !== "function") {
        throw new Error("Методики расчета не переданы");
    }

    const sellerStats = data.sellers.map((seller) => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
    }));

    const sellerIndex = Object.fromEntries(sellerStats.map((s) => [s.id, s]));
    const productIndex = Object.fromEntries(data.products.map((p) => [p.sku, p]));

    data.purchase_records.forEach((record) => {
        const seller = sellerIndex[record.seller_id];
        if (seller) {
            seller.sales_count += 1;
            seller.revenue += record.total_amount;

            record.items.forEach((item) => {
                const product = productIndex[item.sku];
                if (product) {
                    const itemRevenue = calculateRevenue(item, product);
                    const cost = product.purchase_price * item.quantity;
                    seller.profit += itemRevenue - cost;

                    if (!seller.products_sold[item.sku]) {
                        seller.products_sold[item.sku] = 0;
                    }
                    seller.products_sold[item.sku] += item.quantity;
                }
            });
        }
    });

    sellerStats.sort((a, b) => b.profit - a.profit);

    return sellerStats.map((seller, index) => {
        const bonusValue = calculateBonus(index, sellerStats.length, seller);

        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        return {
            seller_id: seller.id,
            name: seller.name,
            revenue: +seller.revenue.toFixed(2),
            profit: +seller.profit.toFixed(2),
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: +bonusValue.toFixed(2),
        };
    });
}
