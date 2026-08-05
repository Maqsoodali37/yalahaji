import { PartialType } from '@nestjs/swagger'
import { CreateCouponDto } from './create-coupon.dto'

/** See UpdateAddressDto — `Partial<T>` is erased at compile time, so
 *  ValidationPipe skips the body entirely. PartialType() emits a real class. */
export class UpdateCouponDto extends PartialType(CreateCouponDto) {}
