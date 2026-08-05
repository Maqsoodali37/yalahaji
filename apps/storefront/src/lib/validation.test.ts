import { describe, it, expect } from 'vitest'
import {
  validate,
  hasErrors,
  required,
  minLength,
  maxLength,
  phone,
  email,
  postalCode,
  inRange,
  addressRules,
  type AddressFormValues,
} from './validation'

describe('rules', () => {
  describe('required', () => {
    it('rejects empty, whitespace-only, null and undefined', () => {
      const rule = required()
      expect(rule('', {})).toBeDefined()
      // Whitespace satisfies a browser's `required` attribute but is not an
      // answer — this is what let blank names through checkout.
      expect(rule('   ', {})).toBeDefined()
      expect(rule(null, {})).toBeDefined()
      expect(rule(undefined, {})).toBeDefined()
      expect(rule([], {})).toBeDefined()
    })

    it('accepts a real value', () => {
      expect(required()('Ali', {})).toBeUndefined()
      expect(required()(0, {})).toBeUndefined()
      expect(required()(false, {})).toBeUndefined()
    })
  })

  describe('phone', () => {
    it('accepts the formats a Pakistani customer actually types', () => {
      const rule = phone()
      expect(rule('+923001234567', {})).toBeUndefined()
      expect(rule('03001234567', {})).toBeUndefined()
      expect(rule('0300 1234567', {})).toBeUndefined()
      expect(rule('92-300-1234567', {})).toBeUndefined()
      expect(rule('3001234567', {})).toBeUndefined()
    })

    it('rejects numbers that are not valid Pakistani mobiles', () => {
      const rule = phone()
      expect(rule('', {})).toBeDefined()
      expect(rule('12345', {})).toBeDefined()
      expect(rule('+1 555 123 4567', {})).toBeDefined()
      expect(rule('not a phone', {})).toBeDefined()
    })
  })

  describe('email', () => {
    it('treats an empty value as acceptable so it can be optional', () => {
      // Mandatory-ness is expressed with `required`, not by this rule.
      expect(email()('', {})).toBeUndefined()
      expect(email()('  ', {})).toBeUndefined()
    })

    it('rejects shapes that cannot be an address', () => {
      expect(email()('ali', {})).toBeDefined()
      expect(email()('ali@', {})).toBeDefined()
      expect(email()('ali@example', {})).toBeDefined()
      expect(email()('a b@example.com', {})).toBeDefined()
    })

    it('accepts ordinary addresses', () => {
      expect(email()('ali@example.com', {})).toBeUndefined()
      expect(email()('ali.hassan+tag@sub.example.co.uk', {})).toBeUndefined()
    })
  })

  describe('postalCode', () => {
    it('is optional but must be 5 digits when present', () => {
      expect(postalCode()('', {})).toBeUndefined()
      expect(postalCode()('54000', {})).toBeUndefined()
      expect(postalCode()('5400', {})).toBeDefined()
      expect(postalCode()('540000', {})).toBeDefined()
      expect(postalCode()('ABCDE', {})).toBeDefined()
    })
  })

  describe('length rules', () => {
    it('measures the trimmed value', () => {
      expect(minLength(2)(' a ', {})).toBeDefined()
      expect(minLength(2)(' ab ', {})).toBeUndefined()
      expect(maxLength(3)('  abcd  ', {})).toBeDefined()
    })
  })

  describe('inRange', () => {
    it('bounds inclusively and rejects NaN', () => {
      expect(inRange(1, 5)(1, {})).toBeUndefined()
      expect(inRange(1, 5)(5, {})).toBeUndefined()
      expect(inRange(1, 5)(0, {})).toBeDefined()
      expect(inRange(1, 5)(6, {})).toBeDefined()
      expect(inRange(1, 5)(Number.NaN, {})).toBeDefined()
      expect(inRange(1, 5)(undefined, {})).toBeDefined()
    })
  })
})

describe('validate', () => {
  it('reports the first failing rule per field, so a blank field says it is missing', () => {
    const errors = validate({ name: '' }, { name: [required('Name is required.'), minLength(5)] })

    expect(errors.name).toBe('Name is required.')
  })

  it('collects every failing field in one pass', () => {
    const errors = validate(
      { a: '', b: '' },
      { a: [required('A missing')], b: [required('B missing')] },
    )

    expect(Object.keys(errors).sort()).toEqual(['a', 'b'])
  })

  it('returns no errors for a valid object', () => {
    expect(hasErrors(validate({ name: 'Ali' }, { name: [required()] }))).toBe(false)
  })
})

describe('addressRules', () => {
  const valid: AddressFormValues = {
    fullName: 'Muhammad Ali',
    phone: '+923001234567',
    addressLine1: 'House 42, Street 5, Gulberg',
    city: 'Lahore',
    province: 'Punjab',
    postalCode: '54000',
  }

  it('accepts a complete address', () => {
    expect(hasErrors(validate(valid, addressRules))).toBe(false)
  })

  it('rejects the empty form that used to reach the API', () => {
    const errors = validate({}, addressRules)

    // Exactly the fields checkout used to submit blank.
    expect(errors.fullName).toBeDefined()
    expect(errors.phone).toBeDefined()
    expect(errors.addressLine1).toBeDefined()
    expect(errors.city).toBeDefined()
    expect(errors.province).toBeDefined()
  })

  it('treats a whitespace-only address as empty', () => {
    const errors = validate(
      { ...valid, fullName: '   ', addressLine1: '   ' },
      addressRules,
    )

    expect(errors.fullName).toBeDefined()
    expect(errors.addressLine1).toBeDefined()
  })

  it('rejects a street address too short to deliver to', () => {
    expect(validate({ ...valid, addressLine1: 'H 4' }, addressRules).addressLine1).toBeDefined()
  })

  it('leaves the optional fields optional', () => {
    const { postalCode: _p, ...withoutOptional } = valid
    expect(hasErrors(validate(withoutOptional, addressRules))).toBe(false)
  })
})
