import { PartialType } from '@nestjs/swagger'
import { CreateBlogPostDto } from './create-blog-post.dto'

/** See UpdateAddressDto — `Partial<T>` is erased at compile time, so
 *  ValidationPipe skips the body entirely. PartialType() emits a real class. */
export class UpdateBlogPostDto extends PartialType(CreateBlogPostDto) {}
