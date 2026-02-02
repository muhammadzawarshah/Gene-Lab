import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "../lib/prisma";

interface CustomerInvoiceline {
    cust_inv_line_id : number | undefined,
    cust_inv_id     : number,
    product_id      : string,
    quantity        : Decimal,
    unit_price      : Decimal,
    discount        : Decimal,
    tax_id          : number,
    line_total      : Decimal,
    customerinvoice : String,
    product         : String,
    tax             : String,
}


class CustomerInvoicelineModel{
    static async getCustomerInvoiceline(custInvLineId: number) {
        const customerInvoiceline = prisma.customerinvoiceline.findUnique({
            where: { cust_inv_line_id: custInvLineId },
        });
        return customerInvoiceline;
    }
    static async createCustomerInvoiceline(data: CustomerInvoiceline) {
        const newCustomerInvoiceline = await prisma.customerinvoiceline.create({
            data: {
                cust_inv_line_id : data.cust_inv_line_id,
                cust_inv_id     : data.cust_inv_id,
                product_id      : data.product_id,
                quantity        : data.quantity,
                unit_price      : data.unit_price,
                discount        : data.discount,
                tax_id          : data.tax_id,
                line_total      : data.line_total,
                customerinvoice : data.customerinvoice,
                product         : data.product,
                tax             : data.tax,
                },
        });
        return newCustomerInvoiceline;
    }
    static async updateCustomerInvoiceline(custInvLineId: number, data: Partial<CustomerInvoiceline>) {
        const updatedCustomerInvoiceline = await prisma.customerinvoiceline.update({
            where: { cust_inv_line_id: custInvLineId },
            data: {
                ...data,
            },
        });
        return updatedCustomerInvoiceline;
    }
    static async deleteCustomerInvoiceline(custInvLineId: number) {
        const deletedCustomerInvoiceline = await prisma.customerinvoiceline.delete({
            where: { cust_inv_line_id: custInvLineId },
        });
        return deletedCustomerInvoiceline;
    }
}

export default CustomerInvoicelineModel;