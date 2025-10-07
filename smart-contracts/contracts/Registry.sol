// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Registry - All fields stored as strings for simplicity
contract Registry {

    struct Record {
        string eCID;     // encrypted CID or plain CID
        string eDEK;     // encrypted DEK (stringified)
        string dHash;    // hash of the encrypted file (hex string)
        uint256 time;    // timestamp of storage
    }

    // recordId => Record
    mapping(string => Record) private records;
    string[] public recordIds;

    event RecordStored(string indexed recordId, uint256 time);

    function storeRecord(
        string calldata recordId,
        string calldata eCID,
        string calldata eDEK,
        string calldata dHash
    ) external {
        require(bytes(records[recordId].eCID).length == 0, "Record already exists");

        records[recordId] = Record({
            eCID: eCID,
            eDEK: eDEK,
            dHash: dHash,
            time: block.timestamp
        });

        recordIds.push(recordId);
        emit RecordStored(recordId, block.timestamp);
    }

    function getRecord(string calldata recordId)
        external
        view
        returns (string memory eCID, string memory eDEK, string memory dHash, uint256 time)
    {
        Record storage r = records[recordId];
        require(bytes(r.eCID).length != 0, "Record not found");
        return (r.eCID, r.eDEK, r.dHash, r.time);
    }

    function totalRecords() external view returns (uint256) {
        return recordIds.length;
    }
}
