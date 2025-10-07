import React, { useState } from "react";
import CryptoJS from "crypto-js";

const FileEncryptor: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [encryptedFiles, setEncryptedFiles] = useState<{ name: string; data: string; key: string }[]>([]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  // Generate a random symmetric key (DEK)
  const generateRandomKey = (): string => {
    return CryptoJS.lib.WordArray.random(16).toString(); // 128-bit key
  };

  // Encrypt a file
  const encryptFile = async (file: File) => {
    const key = generateRandomKey();
    const arrayBuffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as any);
    const encrypted = CryptoJS.AES.encrypt(wordArray, key).toString();
    return { name: file.name, data: encrypted, key };
  };

  // Handle encryption for all selected files
  const handleEncrypt = async () => {
    const encrypted = await Promise.all(files.map(file => encryptFile(file)));
    setEncryptedFiles(encrypted);
    console.log("Encrypted files:", encrypted);
  };

  return (
    <div className="p-4 border rounded-md space-y-4">
      <h2 className="text-lg font-semibold">File Selector & Encryptor</h2>
      <input type="file" multiple onChange={handleFileChange} />
      <button
        onClick={handleEncrypt}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        disabled={files.length === 0}
      >
        Encrypt Files
      </button>

      {encryptedFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">Encrypted Files:</h3>
          <ul className="list-disc pl-5">
            {encryptedFiles.map((file, idx) => (
              <li key={idx}>
                {file.name} - DEK: <code>{file.key}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileEncryptor;
