// import purchaseorder from "../../../models/purchaseorder.model";
// import type{ Request,Response } from "express";

// const createpurchase= async(req:Request,res: Response)=>{
//     try {
//         const {params,paramsline} = req.body;

//         const po = await purchaseorder.createpo(params,paramsline);
//         res.status(200).json({
//             message:"the po created successfully",
//             po
//         })
//     } catch (error) {
//         res.status(500).json({
//             message:"there will an error",
//             error
//         })
//     }
// }

// const updatepo= async(req:Request,res:Response)=>{
//     try {
//         const {params,paramsline , id} = req.body;
//         const po = await purchaseorder.updatepo(id,params,paramsline);
//         res.status(200).json({
//             message:"The purchase order updated",
//             po
//         })
//     } catch (error) {
//         res.status(500).json({
//             message:"there will an error",
//             error
//         })
//     }
// }

// const readonlypo = async(req:Request,res:Response)=>{
//     try {
//         const {id} = req.body;
//         const po = await purchaseorder.readonly(id);
//          res.status(200).json({
//             message:"The purchase order read sucessfully",
//             po
//         })
//     } catch (error) {
//         res.status(500).json({
//             message:"there will an error",
//             error
//         })
//     }
// }


// const readpo = async(req:Request,res:Response)=>{
//     try {
//          const po = await purchaseorder.readall();
//          res.status(200).json({
//             message:"The purchase order read sucessfully",
//             po
//         })
//     } catch (error) {
//         res.status(500).json({
//             message:"there will an error",
//             error
//         })
//     }
// }


// export default {
//     createpurchase,
//     updatepo,
//     readonlypo,
//     readpo
// }