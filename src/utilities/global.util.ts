import { EContractType } from "../types";

export function convertPersianContractTypeToEContractType(contractType: string): EContractType {
  if (contractType.trim() === 'تمام وقت') {
    return EContractType.FULL_TIME
  }

  return EContractType.PART_TIME
}