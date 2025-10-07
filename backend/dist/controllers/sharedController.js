"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSentFiles = exports.getSharedFiles = exports.shareFile = void 0;
const SharedFile_1 = __importDefault(require("../models/SharedFile"));
const User_1 = __importDefault(require("../models/User"));
const shareFile = async (req, res) => {
    try {
        const userPayload = req.user;
        if (!userPayload) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const { receiverEmail, recordId, fileName } = req.body;
        if (!receiverEmail || !recordId || !fileName) {
            return res.status(400).json({
                success: false,
                message: 'receiverEmail, recordId, and fileName are required'
            });
        }
        // Find receiver
        const receiver = await User_1.default.findOne({ email: receiverEmail.toLowerCase().trim() });
        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: 'Receiver not found'
            });
        }
        // Check if already shared
        const existingShare = await SharedFile_1.default.findOne({
            senderId: userPayload.userId,
            receiverId: receiver._id,
            recordId
        });
        if (existingShare) {
            return res.status(409).json({
                success: false,
                message: 'File already shared with this user'
            });
        }
        // Create share record
        const sharedFile = new SharedFile_1.default({
            senderId: userPayload.userId,
            receiverId: receiver._id,
            recordId,
            fileName
        });
        await sharedFile.save();
        res.status(201).json({
            success: true,
            message: 'File shared successfully',
            data: {
                sharedFile: {
                    id: sharedFile._id.toString(),
                    recordId: sharedFile.recordId,
                    fileName: sharedFile.fileName,
                    sharedAt: sharedFile.sharedAt
                }
            }
        });
    }
    catch (error) {
        console.error('Share file error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.shareFile = shareFile;
const getSharedFiles = async (req, res) => {
    try {
        const userPayload = req.user;
        if (!userPayload) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const sharedFiles = await SharedFile_1.default.find({ receiverId: userPayload.userId })
            .populate('senderId', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            message: 'Shared files retrieved successfully',
            data: {
                sharedFiles: sharedFiles.map(sf => ({
                    id: sf._id.toString(),
                    recordId: sf.recordId,
                    fileName: sf.fileName,
                    sharedAt: sf.sharedAt,
                    sender: {
                        name: sf.senderId.name,
                        email: sf.senderId.email
                    }
                }))
            }
        });
    }
    catch (error) {
        console.error('Get shared files error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getSharedFiles = getSharedFiles;
const getSentFiles = async (req, res) => {
    try {
        const userPayload = req.user;
        if (!userPayload) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const sentFiles = await SharedFile_1.default.find({ senderId: userPayload.userId })
            .populate('receiverId', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            message: 'Sent files retrieved successfully',
            data: {
                sentFiles: sentFiles.map(sf => ({
                    id: sf._id.toString(),
                    recordId: sf.recordId,
                    fileName: sf.fileName,
                    sharedAt: sf.sharedAt,
                    receiver: {
                        name: sf.receiverId.name,
                        email: sf.receiverId.email
                    }
                }))
            }
        });
    }
    catch (error) {
        console.error('Get sent files error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getSentFiles = getSentFiles;
