export function generateProjectNumber(
  lastProjectNumber?: string,
  existingNumbers: string[] = []
): string {
  const currentYear = new Date().getFullYear()
  let counter = 1

  // If there's no last project number, start from 001
  if (!lastProjectNumber || !lastProjectNumber.includes('-')) {
    let newNumber = `PRJ-${currentYear}-${counter.toString().padStart(3, '0')}`
    while (existingNumbers.includes(newNumber)) {
      counter++
      newNumber = `PRJ-${currentYear}-${counter.toString().padStart(3, '0')}`
    }
    return newNumber
  }

  // Parse the last project number
  const parts = lastProjectNumber.split('-')
  if (parts.length !== 3) {
    return `PRJ-${currentYear}-001`
  }

  const lastYear = parseInt(parts[1])
  const lastNumber = parseInt(parts[2])

  // If it's a new year, start from 001
  if (currentYear > lastYear) {
    return `PRJ-${currentYear}-001`
  }

  // Increment the last number
  counter = Math.max(lastNumber + 1, counter)
  let newNumber = `PRJ-${currentYear}-${counter.toString().padStart(3, '0')}`

  // Make sure the number is unique
  while (existingNumbers.includes(newNumber)) {
    counter++
    newNumber = `PRJ-${currentYear}-${counter.toString().padStart(3, '0')}`
  }

  return newNumber
}
