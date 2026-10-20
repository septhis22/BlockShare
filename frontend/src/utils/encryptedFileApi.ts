import axios from "axios";

const API_BASE = "http://localhost:5000/api/shared";

export async function uploadEncryptedFileToBackend(
  token: string,
  fileId: string,
  fileName: string,
  recipientEmail: string,
  encryptedAesKey: string,
  recipientPublicKey: string,
  encryptedFile: Blob
): Promise<{ fileId: string; cid: string }> {
  const response = await axios.post(`${API_BASE}/upload`, encryptedFile, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "X-File-Id": fileId,
      "X-File-Name": encodeURIComponent(fileName),
      "X-Recipient-Email": encodeURIComponent(recipientEmail),
      "X-Encrypted-Aes-Key": encodeURIComponent(encryptedAesKey),
      "X-Recipient-Public-Key": encodeURIComponent(recipientPublicKey)
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  });

  const uploadedFile = response.data?.data;
  if (typeof uploadedFile?.fileId !== "string" || typeof uploadedFile?.cid !== "string") {
    throw new Error("The backend did not return the Pinata CID.");
  }
  return { fileId: uploadedFile.fileId, cid: uploadedFile.cid };
}
