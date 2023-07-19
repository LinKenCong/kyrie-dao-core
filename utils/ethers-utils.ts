import { ethers } from "ethers";

export const keccak256 = (v: any) => {
  return ethers.keccak256(v);
};

export const toUtf8Bytes = (v: any) => {
  return ethers.toUtf8Bytes(v);
};

export const id = (v: any) => {
  return ethers.id(v);
};
