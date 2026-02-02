// import {prisma} from "../lib/prisma.js";

// interface Address {
//   address_id : number,
//   party_id   : number,
//   line1      : String,
//   line2      : String,
//   city       : String,
//   postal_code : String,
//   country     : String,
// }

// class AddressModel {
//   static async getAddress(addressId: number) {
//     const address = prisma.addresses.findUnique({
//       where: { address_id: addressId },
//     });
//     return address;
//   }

//   static async createAddress(data: Address) {
//     const newAddress = await prisma.addresses.create({
//       data: {
//         address_id: data.address_id,
//         party_id: data.party_id,
//         line1: data.line1,
//         line2: data.line2,
//         city: data.city,
//         postal_code: data.postal_code,
//         country: data.country
//       },
//     });
//     return newAddress;
//   }

//   static async updateAddress(addressId: number, data: Partial<Address>) {
//     const updatedAddress = await prisma.addresses.update({
//       where: { address_id: addressId },
//       data: {
//         street: data.street,
//         city: data.city,
//         state: data.state,
//         zip_code: data.zip_code
//       },
//     });
//     return updatedAddress;
//   }

//   static async deleteAddress(addressId: number) {
//     const deletedAddress = await prisma.addresses.delete({
//       where: { address_id: addressId },
//     });
//     return deletedAddress;
//   }
// }

// export default AddressModel;