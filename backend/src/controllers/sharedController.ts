import { Response, Request } from 'express';
import SharedFile from '../models/SharedFile';
import User from '../models/User';
import { JwtPayload } from '../types/auth';

export const shareFile = async (req: Request, res: Response) => {
  try {
    const userPayload = req.user as JwtPayload;
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
    const receiver = await User.findOne({ email: receiverEmail.toLowerCase().trim() });
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Check if already shared
    const existingShare = await SharedFile.findOne({
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
    const sharedFile = new SharedFile({
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

  } catch (error) {
    console.error('Share file error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getSharedFiles = async (req: Request, res: Response) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (!userPayload) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const sharedFiles = await SharedFile.find({ receiverId: userPayload.userId })
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
            name: (sf.senderId as any).name,
            email: (sf.senderId as any).email
          }
        }))
      }
    });

  } catch (error) {
    console.error('Get shared files error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getSentFiles = async (req: Request, res: Response) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (!userPayload) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const sentFiles = await SharedFile.find({ senderId: userPayload.userId })
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
            name: (sf.receiverId as any).name,
            email: (sf.receiverId as any).email
          }
        }))
      }
    });

  } catch (error) {
    console.error('Get sent files error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};