import {prisma} from "../lib/prisma";

interface Address {
  address_id : number | undefined,
  party_id   : string,
  line1      : string,
  line2      : string,
  city       : string,
  postal_code : string,
  country     : string,
}

class AddressModel {
  static async getAddress(addressId: number) {
    const address = prisma.addresses.findUnique({
      where: { address_id: addressId },
    });
    return address;
  }

  static async createAddress(data: Address) {
    const newAddress = await prisma.addresses.create({
      data: {
        adderess_id?: data.address_id||undefined,
        party_id: data.party_id,
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        postal_code: data.postal_code,
        country: data.country,
        
      },
    });
    return newAddress;
  }

  static async updateAddress(addressId: number, data: Partial<Address>) {
    const updatedAddress = await prisma.addresses.update({
      where: { address_id: addressId },
      data: {
        ...data,
      },
    });
    return updatedAddress;
  }

  static async deleteAddress(addressId: number) {
    const deletedAddress = await prisma.addresses.delete({
      where: { address_id: addressId },
    });
    return deletedAddress;
  }
}

export default AddressModel;