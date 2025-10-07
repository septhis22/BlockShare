import { PinataSDK } from 'pinata';

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT; 

const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: import.meta.env.VITE_GATEWAY_URL
});

export async function uploadToPinata(encryptedBlob: Blob, fileName: string) {
  try {
    const file = new File([encryptedBlob], fileName, { type: "application/octet-stream" });
    const upload = await pinata.upload.public.file(file);
    console.log('📦 Uploaded to Pinata:', upload);
    return upload.cid; // this is your CID
  } catch (error) {
    console.log(error);
    throw error;
  }
}
