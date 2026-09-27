import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EContractType, EProvider, type IJob } from '../../../types'
import type { IJobService } from '../../../services'
import { PAGINATION_LIMIT } from '../../constants'
import { JobRenderer } from '.'

describe('JobRenderer', () => {
  const getJobsMock = vi.fn<IJobService['getJobs']>()
  const countMock = vi.fn<IJobService['count']>()

  const jobService = {
    getJobs: getJobsMock,
    count: countMock,
  } as unknown as IJobService

  const job: IJob = {
    id: 'job-1',
    title: 'Senior Frontend Engineer',
    url: 'https://example.com/jobs/1',
    contractType: EContractType.FULL_TIME,
    provider: EProvider.JOB_IN_JA,
    company: {
      fullName: 'Example Company',
    },
    location: {
      country: 'Iran',
      province: 'Tehran',
    },
  }

  const createContext = (jobFilter = {}) => ({
    session: {
      jobFilter,
    },
    reply: vi.fn(),
    editMessageText: vi.fn(),
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders jobs using reply', async () => {
    getJobsMock.mockResolvedValue([job])
    countMock.mockResolvedValue(1)

    const context = createContext()

    await new JobRenderer(jobService).render(context as never)

    expect(getJobsMock).toHaveBeenCalledWith(1, PAGINATION_LIMIT, context.session.jobFilter)

    expect(countMock).toHaveBeenCalledWith(context.session.jobFilter)

    expect(context.reply).toHaveBeenCalledOnce()
    expect(context.editMessageText).not.toHaveBeenCalled()

    expect(context.reply).toHaveBeenCalledWith(
      expect.stringContaining('Senior Frontend Engineer'),
      expect.objectContaining({
        parse_mode: 'HTML',
        link_preview_options: {
          is_disabled: true,
        },
      }),
    )
  })

  it('replies with not found message when there are no jobs', async () => {
    getJobsMock.mockResolvedValue([])
    countMock.mockResolvedValue(0)

    const context = createContext()

    await new JobRenderer(jobService).render(context as never)

    expect(context.reply).toHaveBeenCalledWith('متاسفانه شغلی یافت نشد!')

    expect(context.editMessageText).not.toHaveBeenCalled()
  })

  it('renders the requested page', async () => {
    getJobsMock.mockResolvedValue([job])
    countMock.mockResolvedValue(PAGINATION_LIMIT * 3)

    const context = createContext()

    await new JobRenderer(jobService).render(context as never, 2)

    expect(getJobsMock).toHaveBeenCalledWith(2, PAGINATION_LIMIT, context.session.jobFilter)

    expect(context.reply).toHaveBeenCalledWith(
      expect.stringContaining('صفحه 2 از 3'),
      expect.any(Object),
    )
  })

  it('edits the existing message when edit is true', async () => {
    getJobsMock.mockResolvedValue([job])
    countMock.mockResolvedValue(1)

    const context = createContext()

    await new JobRenderer(jobService).render(context as never, 1, true)

    expect(context.editMessageText).toHaveBeenCalledOnce()
    expect(context.reply).not.toHaveBeenCalled()
  })

  it('renders selected contract type filter', async () => {
    getJobsMock.mockResolvedValue([job])
    countMock.mockResolvedValue(1)

    const context = createContext({
      contractType: EContractType.FULL_TIME,
    })

    await new JobRenderer(jobService).render(context as never)

    expect(context.reply).toHaveBeenCalledWith(
      expect.stringContaining('نوع قرارداد:'),
      expect.any(Object),
    )
  })

  it('renders selected provider filter', async () => {
    getJobsMock.mockResolvedValue([job])
    countMock.mockResolvedValue(1)

    const context = createContext({
      provider: EProvider.JOB_IN_JA,
    })

    await new JobRenderer(jobService).render(context as never)

    expect(context.reply).toHaveBeenCalledWith(expect.stringContaining('منبع:'), expect.any(Object))
  })
})
