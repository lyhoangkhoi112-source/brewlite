import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export class CreateOrderItemDto { //Tạo một lớp DTO (Data Transfer Object) để đại diện cho một mục trong đơn hàng. Lớp này có hai thuộc tính: productId và quantity, với các ràng buộc xác thực được áp dụng thông qua các decorator từ thư viện class-validator.
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsIn(['S', 'M', 'L'])
  selectedSize?: string;

  @IsOptional()
  @IsIn(['0%', '50%', '100%'])
  sugarLevel?: string;

  @IsOptional()
  @IsIn(['0%', '50%', '100%'])
  iceLevel?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(['trân châu', 'pudding', 'thạch'], { each: true })
  selectedToppings?: string[];
}

@ValidatorConstraint() //dùng để đăng ký một quy tác kiểm tra tùy chỉnh
class OrderItemsInputConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean { //Hàm validate kiểm tra xem dữ liệu đầu vào có hợp lệ hay không. Nó nhận hai tham số: _value (giá trị cần kiểm tra) và args (các đối số liên quan đến quá trình xác thực). Trong hàm này, chúng ta kiểm tra xem người dùng đã cung cấp các mục đơn hàng hay chưa, hoặc nếu không, họ đã cung cấp productId và quantity hay chưa.
    const request = args.object as CreateOrderDto; //Chuyển đổi đối tượng args.object thành kiểu CreateOrderDto để có thể truy cập các thuộc tính của nó.
    const hasItems = request.items !== undefined; //Kiểm tra xem request có gửi trường items hay không. Nếu có, hasItems sẽ là true, ngược lại sẽ là false.
    const hasLegacyFields =
      request.productId !== undefined || request.quantity !== undefined;

    return hasItems
      ? !hasLegacyFields
      : request.productId !== undefined && request.quantity !== undefined;
  }

  defaultMessage(): string {
    return 'Provide either items or productId and quantity';
  }
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  shippingAddress: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  contactPhone: string;

  @ValidateIf( //Toàn bộ decorator @ValidateIf được sử dụng để xác định điều kiện mà tại đó các ràng buộc xác thực sẽ được áp dụng. Trong trường hợp này, nó kiểm tra xem người dùng đã gửi trường items hay chưa. Nếu không, thì các ràng buộc xác thực sẽ được áp dụng cho productId và quantity.
    (request: CreateOrderDto) =>
      request.items !== undefined ||
      (request.productId === undefined && request.quantity === undefined),
  )
  @Validate(OrderItemsInputConstraint)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ValidateIf((request: CreateOrderDto) => request.items === undefined)
  @IsUUID()
  productId?: string;

  @ValidateIf((request: CreateOrderDto) => request.items === undefined)
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class GuestOrderAccessDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(64, 64, { each: true })
  accessTokens: string[];
}

export class CancelOrderDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(64, 64, { each: true })
  accessTokens?: string[];
}
