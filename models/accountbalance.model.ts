import { Decimal } from '@prisma/client/runtime/client';
import {prisma} from '../lib/prisma';

export interface AccountBalance {
  acc_bal_id    : number,
  gl_account_id  : number,
  period   : string,
  opening_balance : Decimal,
  debit_total    : Decimal,
  credit_total   : Decimal,
  closing_balance : Decimal
}

class AccountBalanceModel {
  static async getAccountBalance(accountId: number) {
    const accountBalance = prisma.accountbalance.findUnique({
      where: { acc_bal_id : accountId },
    });
    return accountBalance;
  }

    static async createAccountBalance(data: AccountBalance) {
    const newAccountBalance = await prisma.accountbalance.create({
        data: {
            acc_bal_id: data.acc_bal_id,
            gl_account_id: data.gl_account_id,
            period: data.period,
            opening_balance: data.opening_balance,
            debit_total: data.debit_total,
            credit_total: data.credit_total,
            closing_balance: data.closing_balance
        },
    });
    return newAccountBalance;
  }

  static async updateAccountBalance(accountId: number, data: Partial<AccountBalance>) {
    const updatedAccountBalance = await prisma.accountbalance.update({
      where: { acc_bal_id: accountId },
      data: {
        gl_account_id: data.gl_account_id,
        period: data.period,
        opening_balance: data.opening_balance,
        debit_total: data.debit_total,
        credit_total: data.credit_total,
        closing_balance: data.closing_balance
      },
    });
    return updatedAccountBalance;
  }


    static async deleteAccountBalance(accountId: number) {
    const deletedAccountBalance = await prisma.accountbalance.delete({
      where: { acc_bal_id: accountId },
    });
    return deletedAccountBalance;
  }



}
export default AccountBalanceModel;