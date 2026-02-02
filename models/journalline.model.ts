import {prisma } from "../lib/prisma";

interface journalline {
  journal_entry_id   : number;
  gl_account_id      : number;
  debit              : Decimal;
  credit             : Decimal;
  party_id_sub_ledger : string;
  cost_center_id      : number;
  glaccount           : string;
  journalentry       : any;
  party              : any;

}


class JournallineModel {
  async create(data: Omit<journalline, 'journal_entry_id' | 'glaccount' | 'journalentry' | 'party'>): Promise<journalline> {
    return prisma.journalline.create({ data });
  }
    async findById(journal_entry_id: number): Promise<journalline | null> {
    return prisma.journalline.findUnique({
      where: { journal_entry_id },
      include: { glaccount: true, journalentry: true, party: true }
    });
  }
    async update(journal_entry_id: number, data: Partial<Omit<journalline, 'journal_entry_id' | 'glaccount' | 'journalentry' | 'party'>>): Promise<journalline> {
    return prisma.journalline.update({
      where: { journal_entry_id },
      data
    });
  }
    async delete(journal_entry_id: number): Promise<journalline> {
    return prisma.journalline.delete({
      where: { journal_entry_id }
    });
    }
    async findAll(): Promise<journalline[]> {
    return prisma.journalline.findMany({
      include: { glaccounst: true, journalentry: true, party: true }
    });
  }
}

export default  JournallineModel;