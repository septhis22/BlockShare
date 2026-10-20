"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSentFiles = exports.getSharedFiles = exports.shareFile = exports.downloadEncryptedFile = exports.uploadEncryptedFile = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_1 = require("mongodb");
const EncryptedFile_1 = __importDefault(require("../models/EncryptedFile"));
const User_1 = __importDefault(require("../models/User"));
const getEncryptedFilesBucket = () => {
    const db = mongoose_1.default.connection.db;
    if (!db)
        throw new Error('MongoDB is not connected');
    return new mongodb_1.GridFSBucket(db, { bucketName: 'encryptedFiles' });
};
const decodeHeader = (value) => {
    if (!value)
        return null;
    try {
        return decodeURIComponent(value);
    }
    catch {
        return null;
    }
};
const uploadEncryptedFile = async (req, res) => {
    try {
        const userPayload = req.user;
        if (!userPayload?.userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const fileId = req.get('x-file-id');
        const fileName = decodeHeader(req.get('x-file-name'));
        const receiverEmail = decodeHeader(req.get('x-recipient-email'));
        const encryptedAesKey = decodeHeader(req.get('x-encrypted-aes-key'));
        const recipientPublicKey = decodeHeader(req.get('x-recipient-public-key'));
        const encryptedBytes = req.body;
        if (!fileId || !/^[a-f0-9-]{36}$/i.test(fileId) || !fileName || !receiverEmail || !encryptedAesKey || !recipientPublicKey || !/^[0-9a-f]{128}$/i.test(recipientPublicKey)) {
            return res.status(400).json({ success: false, message: 'Missing or invalid encrypted-file metadata' });
        }
        if (!Buffer.isBuffer(encryptedBytes) || encryptedBytes.length === 0) {
            return res.status(400).json({ success: false, message: 'Encrypted file body is required' });
        }
        if (encryptedAesKey.length > 8192 || fileName.length > 255) {
            return res.status(413).json({ success: false, message: 'Encrypted-file metadata is too large' });
        }
        const receiver = await User_1.default.findOne({ email: receiverEmail.toLowerCase().trim() });
        if (!receiver) {
            return res.status(404).json({ success: false, message: 'Receiver not found' });
        }
        if (!receiver.public_key) {
            return res.status(409).json({
                success: false,
                message: 'Receiver must connect MetaMask and activate file encryption before files can be shared.'
            });
        }
        if (await EncryptedFile_1.default.exists({ fileId })) {
            return res.status(409).json({ success: false, message: 'File ID already exists' });
        }
        const pinataJwt = process.env.PINATA_JWT?.trim();
        if (!pinataJwt) {
            console.error('PINATA_JWT is not configured');
            return res.status(503).json({ success: false, message: 'File storage is not configured' });
        }
        const formData = new FormData();
        formData.append('network', 'public');
        formData.append('file', new Blob([new Uint8Array(encryptedBytes)], { type: 'application/octet-stream' }), `${fileId}.enc`);
        const pinataResponse = await fetch('https://uploads.pinata.cloud/v3/files', {
            method: 'POST',
            headers: { Authorization: `Bearer ${pinataJwt}` },
            body: formData
        });
        if (!pinataResponse.ok) {
            const errorDetails = (await pinataResponse.text()).slice(0, 1000);
            console.error('Pinata upload failed:', {
                status: pinataResponse.status,
                statusText: pinataResponse.statusText,
                response: errorDetails
            });
            return res.status(502).json({ success: false, message: 'Failed to upload encrypted file to storage' });
        }
        const pinataResult = await pinataResponse.json();
        const cid = pinataResult.data?.cid;
        if (typeof cid !== 'string' || cid.length === 0) {
            console.error('Pinata upload response did not contain a CID');
            return res.status(502).json({ success: false, message: 'Storage did not return a file CID' });
        }
        await EncryptedFile_1.default.create({
            fileId,
            senderId: userPayload.userId,
            receiverId: receiver._id,
            cid,
            fileName,
            encryptedAesKey,
            recipientPublicKey: recipientPublicKey.toLowerCase()
        });
        return res.status(201).json({
            success: true,
            message: 'Encrypted file uploaded to Pinata',
            data: { fileId, cid }
        });
    }
    catch (error) {
        console.error('Encrypted file upload error:', error);
        return res.status(500).json({ success: false, message: 'Failed to store encrypted file' });
    }
};
exports.uploadEncryptedFile = uploadEncryptedFile;
const downloadEncryptedFile = async (req, res) => {
    try {
        const userPayload = req.user;
        if (!userPayload?.userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const encryptedFile = await EncryptedFile_1.default.findOne({
            recordId: req.params.recordId,
            receiverId: userPayload.userId
        });
        if (!encryptedFile) {
            return res.status(404).json({ success: false, message: 'Encrypted file not found for this share' });
        }
        if (!encryptedFile.gridFsId) {
            return res.status(404).json({ success: false, message: 'Legacy encrypted file data not found in GridFS' });
        }
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('X-Encrypted-Aes-Key', encodeURIComponent(encryptedFile.encryptedAesKey));
        res.setHeader('X-Original-File-Name', encodeURIComponent(encryptedFile.fileName));
        const downloadStream = getEncryptedFilesBucket().openDownloadStream(encryptedFile.gridFsId);
        downloadStream.on('error', (error) => {
            console.error('Encrypted file download error:', error);
            if (!res.headersSent)
                res.status(404).json({ success: false, message: 'Encrypted file data not found' });
            else
                res.destroy(error);
        });
        downloadStream.pipe(res);
    }
    catch (error) {
        console.error('Encrypted file retrieval error:', error);
        if (!res.headersSent)
            res.status(500).json({ success: false, message: 'Failed to retrieve encrypted file' });
    }
};
exports.downloadEncryptedFile = downloadEncryptedFile;
const shareFile = async (req, res) => {
    try {
        const userPayload = req.user;
        if (!userPayload) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const { receiverEmail, recordId, fileName, fileId } = req.body;
        if (typeof receiverEmail !== 'string' || !receiverEmail.trim() ||
            typeof recordId !== 'string' || !/^0x[0-9a-f]{64}$/i.test(recordId) ||
            typeof fileName !== 'string' || !fileName.trim() || fileName.length > 255 ||
            typeof fileId !== 'string' || !/^[a-f0-9-]{36}$/i.test(fileId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid receiverEmail, recordId, fileName, and fileId are required'
            });
        }
        const receiver = await User_1.default.findOne({ email: receiverEmail.toLowerCase().trim() });
        if (!receiver) {
            return res.status(404).json({ success: false, message: 'Receiver not found' });
        }
        const encryptedFile = await EncryptedFile_1.default.findOne({
            fileId,
            senderId: userPayload.userId,
            receiverId: receiver._id
        });
        if (!encryptedFile) {
            return res.status(404).json({ success: false, message: 'Uploaded encrypted file does not match this sender and recipient' });
        }
        if (encryptedFile.recipientPublicKey !== receiver.public_key?.toLowerCase()) {
            return res.status(409).json({ success: false, message: 'The recipient encryption key changed during upload. Please retry.' });
        }
        if (encryptedFile.recordId || await EncryptedFile_1.default.exists({ recordId })) {
            return res.status(409).json({ success: false, message: 'File already shared with this user' });
        }
        encryptedFile.recordId = recordId;
        encryptedFile.sharedAt = new Date();
        await encryptedFile.save();
        return res.status(201).json({
            success: true,
            message: 'File shared successfully',
            data: {
                sharedFile: {
                    id: encryptedFile._id.toString(),
                    recordId: encryptedFile.recordId,
                    fileName: encryptedFile.fileName,
                    sharedAt: encryptedFile.sharedAt
                }
            }
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'File or record has already been shared' });
        }
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
        const sharedFiles = await EncryptedFile_1.default.find({
            receiverId: userPayload.userId,
            recordId: { $exists: true }
        })
            .populate('senderId', 'name email')
            .sort({ sharedAt: -1 });
        res.status(200).json({
            success: true,
            message: 'Shared files retrieved successfully',
            data: {
                sharedFiles: sharedFiles.map(sf => ({
                    id: sf._id.toString(),
                    recordId: sf.recordId,
                    fileName: sf.fileName,
                    sharedAt: sf.sharedAt ?? sf.createdAt,
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
        const sentFiles = await EncryptedFile_1.default.find({
            senderId: userPayload.userId,
            recordId: { $exists: true }
        })
            .populate('receiverId', 'name email')
            .sort({ sharedAt: -1 });
        res.status(200).json({
            success: true,
            message: 'Sent files retrieved successfully',
            data: {
                sentFiles: sentFiles.map(sf => ({
                    id: sf._id.toString(),
                    recordId: sf.recordId,
                    fileName: sf.fileName,
                    sharedAt: sf.sharedAt ?? sf.createdAt,
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
