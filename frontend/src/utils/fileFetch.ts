import axios from 'axios';

// If VITE_GATEWAY_URL is set, use it, otherwise default to a public one.
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'https://gateway.pinata.cloud';

export async function fetchFromPinata(cid: string): Promise<Blob> {
  try {
    const url = `${GATEWAY_URL}/ipfs/${cid}`;
    const response = await axios.get(url, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch from Pinata gateway:", error);
    throw error;
  }
}