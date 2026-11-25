import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Locator, Page } from 'playwright'

import { EContractType, EEducationLevel, EGender, EProvider, EWorkMode } from '../../../types'

import { LOCATION_COUNTRY } from './job-in-ja.constant'
import { normalizeText } from '../../../utilities'

import { JobInJaParser } from './jab-in-ja.parse'

// --------------------------------------------------
// Locator Mock
// --------------------------------------------------

interface LocatorMockOptions {
  text?: string | null
  attributes?: Record<string, string>
  children?: Record<string, Locator>
  items?: Locator[]
  texts?: string[]
}

const createLocator = ({
  text = null,
  attributes = {},
  children = {},
  items = [],
  texts = [],
}: LocatorMockOptions = {}): Locator => {
  const locator = {
    textContent: vi.fn().mockResolvedValue(text),

    getAttribute: vi.fn((name: string) => Promise.resolve(attributes[name] ?? null)),

    locator: vi.fn((selector: string) => {
      const child = children[selector]

      if (!child) {
        throw new Error(`Locator not found: ${selector}`)
      }

      return child
    }),

    nth: vi.fn((index: number) => {
      const item = items[index]

      if (!item) {
        throw new Error(`Locator index not found: ${index}`)
      }

      return item
    }),

    count: vi.fn().mockResolvedValue(items.length),

    allTextContents: vi.fn().mockResolvedValue(texts),
  }

  return locator as unknown as Locator
}

// --------------------------------------------------
// Summary Fixture
// --------------------------------------------------

interface SummaryFixtureOptions {
  title?: string
  url?: string | null
  passedDays?: string
  company?: string
  location?: string
  contractType?: string
}

const createSummaryContent = ({
  title = 'Frontend Developer',
  url = 'https://jobinja.ir/jobs/1',
  passedDays = '۳ روز پیش',
  company = 'شرکت نمونه | Example Company',
  location = 'تهران، تهران',
  contractType = 'قرارداد تمام وقت',
}: SummaryFixtureOptions = {}): Locator => {
  return createLocator({
    children: {
      '.c-jobListView__titleLink': createLocator({
        text: title,
        attributes: url === null ? {} : { href: url },
      }),

      '.c-jobListView__passedDays': createLocator({
        text: passedDays,
      }),

      '.c-jobListView__metaItem': createLocator({
        items: [
          createLocator({
            children: {
              span: createLocator({
                text: company,
              }),
            },
          }),

          createLocator({
            children: {
              span: createLocator({
                text: location,
              }),
            },
          }),

          createLocator({
            children: {
              'span > span': createLocator({
                items: [
                  createLocator({
                    text: contractType,
                  }),
                ],
              }),
            },
          }),
        ],
      }),
    },
  })
}

// --------------------------------------------------
// Detail Fixture
// --------------------------------------------------

type InfoItem = [title: string | null, values: string[]]

const createDetailContent = (infoItems: InfoItem[] = []): Locator => {
  return createLocator({
    children: {
      '.c-infoBox__item': createLocator({
        items: infoItems.map(([title, values]) =>
          createLocator({
            children: {
              '.c-infoBox__itemTitle': createLocator({
                text: title,
              }),

              '.tags .black': createLocator({
                texts: values,
              }),
            },
          }),
        ),
      }),
    },
  })
}

// --------------------------------------------------
// Tests
// --------------------------------------------------

describe('JobInJaParser', () => {
  let parser: JobInJaParser

  const page = {} as Page

  const jobUrl = 'https://jobinja.ir/jobs/1'

  const currentDate = new Date('2026-01-04T10:00:00Z')
  const postedAt = new Date('2026-01-01T10:00:00Z')

  beforeEach(() => {
    vi.resetAllMocks()

    vi.useFakeTimers()
    vi.setSystemTime(currentDate)

    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    parser = new JobInJaParser(page)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ------------------------------------------------
  // parseSummary
  // ------------------------------------------------

  describe('parseSummary', () => {
    it('should parse a valid job summary', async () => {
      const content = createSummaryContent()

      const result = await parser.parseSummary(content)

      expect(result).toEqual({
        title: 'Frontend Developer',
        url: jobUrl,
        provider: EProvider.JOB_IN_JA,
        postedAt,
        contractType: EContractType.FULL_TIME,
        company: {
          fullName: 'شرکت نمونه | Example Company',
          persianName: 'شرکت نمونه',
          englishName: 'Example Company',
        },
        location: {
          country: LOCATION_COUNTRY,
          province: 'تهران',
        },
      })
    })

    it('should trim the job title', async () => {
      const content = createSummaryContent({
        title: '   Senior Frontend Developer   ',
      })

      const result = await parser.parseSummary(content)

      expect(result?.title).toBe('Senior Frontend Developer')
    })

    it('should return an empty title when the title is empty', async () => {
      const content = createSummaryContent({
        title: '',
      })

      const result = await parser.parseSummary(content)

      expect(result?.title).toBe('')
    })

    it('should preserve the original job URL', async () => {
      const url = `${jobUrl}?source=search`

      const content = createSummaryContent({ url })

      const result = await parser.parseSummary(content)

      expect(result?.url).toBe(url)
    })

    it('should return undefined when the URL is missing', async () => {
      const content = createSummaryContent({
        url: null,
      })

      const result = await parser.parseSummary(content)

      expect(result).toBeUndefined()
    })

    it('should return undefined when the URL is empty', async () => {
      const content = createSummaryContent({
        url: '',
      })

      const result = await parser.parseSummary(content)

      expect(result).toBeUndefined()
    })

    it('should always use JOB_IN_JA as the provider', async () => {
      const result = await parser.parseSummary(createSummaryContent())

      expect(result?.provider).toBe(EProvider.JOB_IN_JA)
    })

    // ----------------------------------------------
    // Publication Date
    // ----------------------------------------------

    describe('publication date', () => {
      it.each([
        ['۱ روز پیش', '2026-01-03T10:00:00Z'],
        ['۳ روز پیش', '2026-01-01T10:00:00Z'],
        ['۱۲ روز پیش', '2025-12-23T10:00:00Z'],
        ['۳۰ روز پیش', '2025-12-05T10:00:00Z'],
        ['5 روز پیش', '2025-12-30T10:00:00Z'],
        ['۰ روز پیش', '2026-01-04T10:00:00Z'],
      ])('should parse publication date from "%s"', async (passedDays, expected) => {
        const content = createSummaryContent({
          passedDays,
        })

        const result = await parser.parseSummary(content)

        expect(result).toBeDefined()
        expect(result?.postedAt).toEqual(new Date(expected))
      })

      it.each(['امروز', '', '   '])(
        'should use the current date when passedDays is "%s"',
        async (passedDays) => {
          const content = createSummaryContent({
            passedDays,
          })

          const result = await parser.parseSummary(content)

          expect(result).toBeDefined()
          expect(result?.postedAt).toEqual(currentDate)
        },
      )
    })

    // ----------------------------------------------
    // Contract Type
    // ----------------------------------------------

    describe('contract type', () => {
      it.each([
        ['قرارداد تمام وقت', EContractType.FULL_TIME],
        ['قرارداد پاره وقت', EContractType.PART_TIME],
        ['  قرارداد تمام وقت  ', EContractType.FULL_TIME],
        ['تمام وقت', EContractType.FULL_TIME],
      ])('should convert "%s" to %s', async (contractType, expected) => {
        const content = createSummaryContent({
          contractType,
        })

        const result = await parser.parseSummary(content)

        expect(result?.contractType).toBe(expected)
      })
    })

    // ----------------------------------------------
    // Company
    // ----------------------------------------------

    describe('company', () => {
      it('should parse Persian and English company names', async () => {
        const content = createSummaryContent({
          company: 'اسنپ | Snapp',
        })

        const result = await parser.parseSummary(content)

        expect(result?.company).toEqual({
          fullName: 'اسنپ | Snapp',
          persianName: 'اسنپ',
          englishName: 'Snapp',
        })
      })

      it('should parse a company with only a Persian name', async () => {
        const content = createSummaryContent({
          company: 'اسنپ',
        })

        const result = await parser.parseSummary(content)

        expect(result?.company).toEqual({
          fullName: 'اسنپ',
          persianName: 'اسنپ',
          englishName: undefined,
        })
      })

      it('should trim company names', async () => {
        const content = createSummaryContent({
          company: '   اسنپ   |   Snapp   ',
        })

        const result = await parser.parseSummary(content)

        expect(result?.company).toEqual({
          fullName: 'اسنپ   |   Snapp',
          persianName: 'اسنپ',
          englishName: 'Snapp',
        })
      })

      it('should handle an empty company name', async () => {
        const content = createSummaryContent({
          company: '',
        })

        const result = await parser.parseSummary(content)

        expect(result?.company).toEqual({
          fullName: '',
          persianName: '',
          englishName: undefined,
        })
      })

      it('should use only the first two company name segments', async () => {
        const content = createSummaryContent({
          company: 'اسنپ | Snapp | Group',
        })

        const result = await parser.parseSummary(content)

        expect(result?.company).toEqual({
          fullName: 'اسنپ | Snapp | Group',
          persianName: 'اسنپ',
          englishName: 'Snapp',
        })
      })
    })

    // ----------------------------------------------
    // Location
    // ----------------------------------------------

    describe('location', () => {
      it.each([
        ['تهران، تهران', 'تهران'],
        ['آذربایجان شرقی، تبریز', 'آذربایجان شرقی'],
        ['اصفهان، اصفهان', 'اصفهان'],
        ['  فارس  ، شیراز  ', 'فارس'],
        ['تهران', 'تهران'],
        ['', ''],
      ])('should extract the province from "%s"', async (location, expected) => {
        const content = createSummaryContent({
          location,
        })

        const result = await parser.parseSummary(content)

        expect(result?.location).toEqual({
          country: LOCATION_COUNTRY,
          province: expected,
        })
      })
    })

    // ----------------------------------------------
    // Summary Error Handling
    // ----------------------------------------------

    describe('error handling', () => {
      it('should return undefined when a locator fails', async () => {
        const content = createLocator()

        const result = await parser.parseSummary(content)

        expect(result).toBeUndefined()
      })

      it('should log an error when summary parsing fails', async () => {
        const errorSpy = vi.spyOn(console, 'error')

        const content = createSummaryContent({
          url: null,
        })

        await parser.parseSummary(content)

        expect(errorSpy).toHaveBeenCalledWith('Jobinja summery parser has been occurred an Error!')
      })

      it('should parse another summary after a failure', async () => {
        const invalidContent = createSummaryContent({
          url: null,
        })

        const invalidResult = await parser.parseSummary(invalidContent)

        expect(invalidResult).toBeUndefined()

        const validResult = await parser.parseSummary(createSummaryContent())

        expect(validResult?.url).toBe(jobUrl)
      })
    })
  })

  // ------------------------------------------------
  // parseDetail
  // ------------------------------------------------

  describe('parseDetail', () => {
    it('should parse a complete job detail', async () => {
      const content = createDetailContent([
        ['دسته بندی شغلی', ['برنامه نویسی']],
        ['حقوق', ['از ۳۰,۰۰۰,۰۰۰ تومان']],
        ['جنسیت', ['مرد']],
        ['حداقل مدرک تحصیلی', ['کارشناسی']],
        ['مهارت های مورد نیاز', ['React', 'TypeScript']],
        ['نوع همکاری', ['تمام وقت', 'دورکاری']],
        ['حداقل سابقه کار', ['۳ تا ۵ سال']],
      ])

      const result = await parser.parseDetail(content, jobUrl)

      expect(result).toEqual({
        category: normalizeText('برنامه نویسی'),
        salary: '30000000',
        gender: EGender.MAN,
        education: EEducationLevel.BACHELOR,
        skills: [normalizeText('React'), normalizeText('TypeScript')],
        workMode: EWorkMode.HYBRID,
        experience: {
          raw: normalizeText('۳ تا ۵ سال'),
          minYears: 3,
          maxYears: 5,
        },
        applicationUrl: jobUrl,
      })
    })

    it('should use the provided URL as the application URL', async () => {
      const url = `${jobUrl}?source=telegram`

      const result = await parser.parseDetail(createDetailContent(), url)

      expect(result?.applicationUrl).toBe(url)
    })

    // ----------------------------------------------
    // Category
    // ----------------------------------------------

    describe('category', () => {
      it('should extract the job category', async () => {
        const content = createDetailContent([['دسته بندی شغلی', ['برنامه نویسی']]])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result?.category).toBe(normalizeText('برنامه نویسی'))
      })

      it('should use the first category', async () => {
        const content = createDetailContent([
          ['دسته بندی شغلی', ['برنامه نویسی', 'فناوری اطلاعات']],
        ])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result?.category).toBe(normalizeText('برنامه نویسی'))
      })

      it('should return undefined when the category is missing', async () => {
        const result = await parser.parseDetail(createDetailContent(), jobUrl)

        expect(result).toBeDefined()
        expect(result?.category).toBeUndefined()
      })
    })

    // ----------------------------------------------
    // Salary
    // ----------------------------------------------

    describe('salary', () => {
      it.each([
        ['از ۳۰,۰۰۰,۰۰۰ تومان', '30000000'],
        ['از ۵۰,۰۰۰,۰۰۰ تومان', '50000000'],
        ['۲۰۰۰۰۰۰۰ تومان', '20000000'],
        ['25000000 تومان', '25000000'],
        ['  ۱۵,۰۰۰,۰۰۰ تومان  ', '15000000'],
      ])('should convert salary "%s" to "%s"', async (salary, expected) => {
        const content = createDetailContent([['حقوق', [salary]]])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result?.salary).toBe(expected)
      })

      it('should return undefined when salary is negotiable', async () => {
        const content = createDetailContent([['حقوق', ['توافقی']]])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result).toBeDefined()
        expect(result?.salary).toBeUndefined()
      })

      it('should return an empty string when salary is missing', async () => {
        const result = await parser.parseDetail(createDetailContent(), jobUrl)

        expect(result?.salary).toBe('')
      })
    })

    // ----------------------------------------------
    // Gender
    // ----------------------------------------------

    describe('gender', () => {
      it.each([
        ['مرد', EGender.MAN],
        ['زن', EGender.WOMAN],
        ['مهم نیست', undefined],
        ['  زن  ', EGender.WOMAN],
      ] satisfies Array<[string, EGender | undefined]>)(
        'should convert gender "%s" to %s',
        async (gender, expected) => {
          const content = createDetailContent([['جنسیت', [gender]]])

          const result = await parser.parseDetail(content, jobUrl)

          expect(result).toBeDefined()
          expect(result?.gender).toBe(expected)
        },
      )
    })

    // ----------------------------------------------
    // Education
    // ----------------------------------------------

    describe('education', () => {
      it.each([
        ['دیپلم', EEducationLevel.HIGH_SCHOOL],
        ['کاردانی', EEducationLevel.ASSOCIATE],
        ['فوق‌دیپلم', EEducationLevel.ASSOCIATE],
        ['کارشناسی', EEducationLevel.BACHELOR],
        ['کارشناسی ارشد', EEducationLevel.MASTER],
        ['فوق‌لیسانس', EEducationLevel.MASTER],
        ['دکتری', EEducationLevel.PHD],
        ['مهم نیست', undefined],
      ] satisfies Array<[string, EEducationLevel | undefined]>)(
        'should convert education "%s" to %s',
        async (education, expected) => {
          const content = createDetailContent([['حداقل مدرک تحصیلی', [education]]])

          const result = await parser.parseDetail(content, jobUrl)

          expect(result).toBeDefined()
          expect(result?.education).toBe(expected)
        },
      )
    })

    // ----------------------------------------------
    // Skills
    // ----------------------------------------------

    describe('skills', () => {
      it('should extract all skills', async () => {
        const content = createDetailContent([
          ['مهارت های مورد نیاز', ['React', 'TypeScript', 'JavaScript']],
        ])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result?.skills).toEqual(['React', 'TypeScript', 'JavaScript'].map(normalizeText))
      })

      it('should remove empty skills', async () => {
        const content = createDetailContent([
          ['مهارت های مورد نیاز', ['React', '', '   ', 'TypeScript']],
        ])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result?.skills).toEqual(['React', 'TypeScript'].map(normalizeText))
      })

      it('should normalize skill names', async () => {
        const content = createDetailContent([
          ['مهارت های مورد نیاز', ['  React  ', '  TypeScript  ']],
        ])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result?.skills).toEqual(['React', 'TypeScript'].map(normalizeText))
      })

      it('should preserve the order of skills', async () => {
        const skills = ['Node.js', 'React', 'TypeScript']

        const content = createDetailContent([['مهارت های مورد نیاز', skills]])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result?.skills).toEqual(skills.map(normalizeText))
      })

      it('should return an empty array when skills are missing', async () => {
        const result = await parser.parseDetail(createDetailContent(), jobUrl)

        expect(result?.skills).toEqual([])
      })
    })

    // ----------------------------------------------
    // Work Mode
    // ----------------------------------------------

    describe('work mode', () => {
      it.each([
        [['تمام وقت'], EWorkMode.ONSITE],
        [['پاره وقت'], EWorkMode.ONSITE],
        [['دورکاری'], EWorkMode.REMOTE],
        [['تمام وقت', 'دورکاری'], EWorkMode.HYBRID],
        [['پاره وقت', 'دورکاری'], EWorkMode.HYBRID],
        [['دورکاری', 'تمام وقت'], EWorkMode.HYBRID],
        [['دورکاری', 'پاره وقت'], EWorkMode.HYBRID],
        [['تمام وقت', 'پاره وقت'], EWorkMode.ONSITE],
      ] satisfies Array<[string[], EWorkMode]>)(
        'should convert work modes %j to %s',
        async (workModes, expected) => {
          const content = createDetailContent([['نوع همکاری', workModes]])

          const result = await parser.parseDetail(content, jobUrl)

          expect(result?.workMode).toBe(expected)
        },
      )

      it('should return undefined when work mode is missing', async () => {
        const result = await parser.parseDetail(createDetailContent(), jobUrl)

        expect(result).toBeDefined()
        expect(result?.workMode).toBeUndefined()
      })

      it('should return undefined when work mode is empty', async () => {
        const content = createDetailContent([['نوع همکاری', []]])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result).toBeDefined()
        expect(result?.workMode).toBeUndefined()
      })

      it('should return undefined for more than two work modes', async () => {
        const content = createDetailContent([['نوع همکاری', ['تمام وقت', 'پاره وقت', 'دورکاری']]])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result).toBeDefined()
        expect(result?.workMode).toBeUndefined()
      })
    })

    // ----------------------------------------------
    // Experience
    // ----------------------------------------------

    describe('experience', () => {
      it.each([
        ['کمتر از ۱ سال', 1],
        ['کمتر از ۲ سال', 2],
        ['کمتر از ۵ سال', 5],
      ] satisfies Array<[string, number]>)(
        'should parse maximum experience "%s"',
        async (experience, maxYears) => {
          const content = createDetailContent([['حداقل سابقه کار', [experience]]])

          const result = await parser.parseDetail(content, jobUrl)

          expect(result?.experience).toEqual({
            raw: normalizeText(experience),
            maxYears,
          })
        },
      )

      it.each([
        ['۱ تا ۳ سال', 1, 3],
        ['۳ تا ۵ سال', 3, 5],
        ['۵ تا ۱۰ سال', 5, 10],
        ['2 تا 4 سال', 2, 4],
      ] satisfies Array<[string, number, number]>)(
        'should parse experience range "%s"',
        async (experience, minYears, maxYears) => {
          const content = createDetailContent([['حداقل سابقه کار', [experience]]])

          const result = await parser.parseDetail(content, jobUrl)

          expect(result?.experience).toEqual({
            raw: normalizeText(experience),
            minYears,
            maxYears,
          })
        },
      )

      it.each([
        ['بیش از ۳ سال', 3],
        ['بیش از ۵ سال', 5],
        ['بیش از ۱۰ سال', 10],
        ['۲ سال', 2],
      ] satisfies Array<[string, number]>)(
        'should parse minimum experience "%s"',
        async (experience, minYears) => {
          const content = createDetailContent([['حداقل سابقه کار', [experience]]])

          const result = await parser.parseDetail(content, jobUrl)

          expect(result?.experience).toEqual({
            raw: normalizeText(experience),
            minYears,
          })
        },
      )

      it('should parse experience with zero-width non-joiners', async () => {
        const experience = '۳\u200Cتا\u200C۵ سال'

        const content = createDetailContent([['حداقل سابقه کار', [experience]]])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result?.experience).toEqual({
          raw: normalizeText(experience),
          minYears: 3,
          maxYears: 5,
        })
      })

      it('should return undefined when experience does not matter', async () => {
        const content = createDetailContent([['حداقل سابقه کار', ['مهم نیست']]])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result).toBeDefined()
        expect(result?.experience).toBeUndefined()
      })

      it('should return undefined when experience is missing', async () => {
        const result = await parser.parseDetail(createDetailContent(), jobUrl)

        expect(result).toBeDefined()
        expect(result?.experience).toBeUndefined()
      })

      it('should return undefined when experience is empty', async () => {
        const content = createDetailContent([['حداقل سابقه کار', ['']]])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result).toBeDefined()
        expect(result?.experience).toBeUndefined()
      })
    })

    // ----------------------------------------------
    // Info Items
    // ----------------------------------------------

    describe('info items', () => {
      it('should ignore info items without a title', async () => {
        const content = createDetailContent([
          [null, ['Invalid value']],
          ['دسته بندی شغلی', ['برنامه نویسی']],
        ])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result?.category).toBe(normalizeText('برنامه نویسی'))
      })

      it('should normalize info item titles', async () => {
        const content = createDetailContent([['  دسته بندی شغلی  ', ['برنامه نویسی']]])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result?.category).toBe(normalizeText('برنامه نویسی'))
      })

      it('should ignore unsupported info items', async () => {
        const content = createDetailContent([
          ['وضعیت نظام وظیفه', ['مهم نیست']],
          ['Unknown attribute', ['Unknown value']],
          ['دسته بندی شغلی', ['برنامه نویسی']],
        ])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result?.category).toBe(normalizeText('برنامه نویسی'))

        expect(result).not.toHaveProperty('Unknown attribute')
      })

      it('should use the last value for duplicate titles', async () => {
        const content = createDetailContent([
          ['دسته بندی شغلی', ['برنامه نویسی']],
          ['دسته بندی شغلی', ['فناوری اطلاعات']],
        ])

        const result = await parser.parseDetail(content, jobUrl)

        expect(result?.category).toBe(normalizeText('فناوری اطلاعات'))
      })

      it('should handle an empty info item list', async () => {
        const result = await parser.parseDetail(createDetailContent(), jobUrl)

        expect(result).toBeDefined()
        expect(result?.category).toBeUndefined()
        expect(result?.skills).toEqual([])
        expect(result?.experience).toBeUndefined()
        expect(result?.workMode).toBeUndefined()
        expect(result?.applicationUrl).toBe(jobUrl)
      })
    })

    // ----------------------------------------------
    // Detail Error Handling
    // ----------------------------------------------

    describe('error handling', () => {
      it('should return undefined when a locator fails', async () => {
        const content = createLocator()

        const result = await parser.parseDetail(content, jobUrl)

        expect(result).toBeUndefined()
      })

      it('should return undefined when counting info items fails', async () => {
        const items = createLocator()

        vi.spyOn(items, 'count').mockRejectedValueOnce(new Error('Failed to count info items'))

        const content = createLocator({
          children: {
            '.c-infoBox__item': items,
          },
        })

        const result = await parser.parseDetail(content, jobUrl)

        expect(result).toBeUndefined()
      })

      it('should log the original parsing error', async () => {
        const errorSpy = vi.spyOn(console, 'error')

        const error = new Error('Failed to read info items')

        const items = createLocator()

        vi.spyOn(items, 'count').mockRejectedValueOnce(error)

        const content = createLocator({
          children: {
            '.c-infoBox__item': items,
          },
        })

        await parser.parseDetail(content, jobUrl)

        expect(errorSpy).toHaveBeenCalledWith('Jobinja detail parser has been occurred an Error!', {
          error,
        })
      })

      it('should parse another detail after a failure', async () => {
        const invalidResult = await parser.parseDetail(createLocator(), jobUrl)

        expect(invalidResult).toBeUndefined()

        const content = createDetailContent([['مهارت های مورد نیاز', ['React']]])

        const validResult = await parser.parseDetail(content, jobUrl)

        expect(validResult?.skills).toEqual([normalizeText('React')])
      })
    })
  })
})
