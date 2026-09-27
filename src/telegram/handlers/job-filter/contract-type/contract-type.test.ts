import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EContractType, EProvider, type IJobFilter } from '../../../../types'
import type { IJobRenderer } from '../../../renders'
import type { TelegramContextType } from '../../../telegram.model'
import { ContractTypeFilterKeyboard } from '../../../keyboards'
import { ContractTypeFilter } from './contract-type.filter'

describe('ContractTypeFilter', () => {
  const renderMock = vi.fn<IJobRenderer['render']>()

  const jobRenderer = {
    render: renderMock,
  } as IJobRenderer

  const keyboard = new ContractTypeFilterKeyboard()

  const createContext = (jobFilter: IJobFilter = {}) => {
    const answerCallbackQueryMock = vi.fn()
    const editMessageTextMock = vi.fn()

    const context = {
      session: {
        jobFilter,
      },
      answerCallbackQuery: answerCallbackQueryMock,
      editMessageText: editMessageTextMock,
    } as unknown as TelegramContextType

    return {
      context,
      answerCallbackQueryMock,
      editMessageTextMock,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows contract type filter menu', async () => {
    const filter = new ContractTypeFilter(keyboard, jobRenderer)
    const { context, answerCallbackQueryMock, editMessageTextMock } = createContext()
    await filter.show(context, 3)

    expect(answerCallbackQueryMock).toHaveBeenCalledOnce()
    expect(editMessageTextMock).toHaveBeenCalledOnce()
  })

  it('selects contract type and renders jobs from first page', async () => {
    const filter = new ContractTypeFilter(keyboard, jobRenderer)
    const { context, answerCallbackQueryMock } = createContext()
    await filter.select(context, EContractType.FULL_TIME)

    expect(context.session.jobFilter.contractType).toBe(EContractType.FULL_TIME)
    expect(answerCallbackQueryMock).toHaveBeenCalledOnce()
    expect(renderMock).toHaveBeenCalledWith(context, 1, true)
  })

  it('clears only contract type filter', async () => {
    const filter = new ContractTypeFilter(keyboard, jobRenderer)

    const { context, answerCallbackQueryMock } = createContext({
      contractType: EContractType.FULL_TIME,
      provider: EProvider.JOB_IN_JA,
    })

    await filter.clear(context)

    expect(context.session.jobFilter).toEqual({
      provider: EProvider.JOB_IN_JA,
    })
    expect(answerCallbackQueryMock).toHaveBeenCalledOnce()
    expect(renderMock).toHaveBeenCalledWith(context, 1, true)
  })
})
