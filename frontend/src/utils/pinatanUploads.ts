import axios from 'axios';

const PINATA_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT; // store in .env

export async function uploadToPinata(encryptedBlob: Blob, fileName: string) {
  const formData = new FormData();
  formData.append('file', encryptedBlob, fileName);

  const res = await axios.post(PINATA_URL, formData, {
    maxBodyLength: Infinity,
    headers: {
      'Authorization': `Bearer ${PINATA_JWT}`,
    },
  });

  console.log('📦 Uploaded to Pinata:', res.data);
  return res.data.IpfsHash; // this is your CID
}
