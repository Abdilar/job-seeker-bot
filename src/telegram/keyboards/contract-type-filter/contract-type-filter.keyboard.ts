import { InlineKeyboard } from "grammy"
import { IContractTypeFilterKeyboard } from './contract-type-filter.model'
import { CONTRACT_TYPE_MAP } from "../../../constants"
import { EContractType } from "../../../types"

export class ContractTypeFilterKeyboard implements IContractTypeFilterKeyboard {
  create(): InlineKeyboard {
    return new InlineKeyboard()
      .text(CONTRACT_TYPE_MAP.full_time, `filter:contractType:${EContractType.FULL_TIME}`)
      .row()
      .text(CONTRACT_TYPE_MAP.part_time, `filter:contractType:${EContractType.PART_TIME}`)
      .row()
      .text('❌ حذف فیلتر', 'filter:contractType:clear')
      .row()
      .text('⬅️ بازگشت', 'filter:contractType:back')
      
   }
}