const digitMap: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
}

const persianNumberMap: Record<string, number> = {
  صفر: 0,
  یک: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
  یازده: 11,
  دوازده: 12,
  سیزده: 13,
  چهارده: 14,
  پانزده: 15,
  شانزده: 16,
  هفده: 17,
  هجده: 18,
  نوزده: 19,
  بیست: 20,
  سی: 30,
  چهل: 40,
  پنجاه: 50,
  شصت: 60,
  هفتاد: 70,
  هشتاد: 80,
  نود: 90,
}

export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => digitMap[d])
}

export function persianNumbersToDigits(value: string): number | undefined {
  const numbers = value.trim().split(/[\s\u200C]+و[\s\u200C]+/)

  if (numbers.length === 1) {
    return persianNumberMap[numbers[0]]
  }

  if (numbers.length === 2) {
    const firstNumber = persianNumberMap[numbers[0]]
    const secondNumber = persianNumberMap[numbers[1]]

    if (firstNumber === undefined || secondNumber === undefined) {
      return undefined
    }

    return firstNumber + secondNumber
  }

  return undefined
}
