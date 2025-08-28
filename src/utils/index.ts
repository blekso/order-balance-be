import { TypedDataField } from 'ethers';

export const orderTypes: Record<string, TypedDataField[]> = {
  Order: [
    { name: 'maker', type: 'address' },
    { name: 'symbol', type: 'string' },
    { name: 'price', type: 'uint256' },
    { name: 'quantity', type: 'uint256' },
    { name: 'total', type: 'uint256' },
    { name: 'orderType', type: 'uint8' },
    { name: 'status', type: 'uint8' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
};
