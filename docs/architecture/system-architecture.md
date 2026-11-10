# BrewLite - Tài liệu Thiết kế Kiến trúc Hệ thống (System Architecture Document)

| Thông tin dự án | Chi tiết |
| :--- | :--- |
| **Dự án** | BrewLite - Nền tảng đặt thức uống không tiền mặt |
| **Kiến trúc áp dụng** | Monorepo + Layered Architecture (Kiến trúc phân lớp) |
| **Công nghệ chính** | Next.js (Web/PWA), NestJS (API), PostgreSQL (Database), Prisma (ORM) |

---

## 1. Giới thiệu và Bối cảnh Kiến trúc

Hệ thống **BrewLite** được thiết kế nhằm phục vụ bài toán nghiệp vụ cốt lõi: cho phép khách hàng duyệt thực đơn, tùy chọn sản phẩm (size/topping), đưa vào giỏ hàng, đặt đơn và thanh toán không tiền mặt với trải nghiệm mượt mà, hạn chế thời gian xếp hàng tại quầy.

Hệ sinh thái mã nguồn được quy hoạch theo mô hình **Monorepo** với ba phân vùng chính:
* `apps/web`: Ứng dụng Frontend hướng người dùng.
* `apps/api`: Dịch vụ Backend cung cấp toàn bộ RESTful API và xử lý nghiệp vụ.
* `docs/`: Nơi lưu trữ toàn bộ hồ sơ yêu cầu (SRS), mô hình hóa (UML), quyết định kiến trúc (ADR) và ma trận truy vết.

```text
brewlite/
├── apps/
│   ├── web/               # Next.js 14+ (App Router, PWA/Mobile-first)
│   └── api/               # NestJS REST API
├── docs/
│   ├── requirements/      # Task 1: SRS, Use-case specs
│   ├── diagrams/          # Task 2 & Task 3: Activity, Sequence, Class, Deployment diagrams
│   ├── architecture/      # Task 3.1: Architecture doc & ADRs
│   │   ├── adr/
│   │   └── system-architecture.md
│   └── traceability-matrix.md
├── docker-compose.yml     # Điều phối môi trường phát triển cục bộ
└── README.md
```

---

## 2. Mô hình Kiến trúc Phân lớp Backend (`apps/api`)

Backend của BrewLite được triển khai bằng NestJS theo phong cách **Kiến trúc phân lớp (Layered Architecture)** kết hợp với tổ chức theo **Domain Modules**. Mỗi module nghiệp vụ (`AuthModule`, `ProductsModule`, `OrdersModule`, `PaymentsModule`) tuân thủ nghiêm ngặt mô hình phân tách trách nhiệm (Separation of Concerns):

```text
[ Client Request: Next.js Frontend ]
                 │ (HTTP / JSON / JWT Header)
                 ▼
┌────────────────────────────────────────────────────────┐
│  Presentation / Transport Layer (Controllers & Guards) │
│  - Routing & HTTP Response status                      │
│  - DTO Validation (class-validator)                    │
│  - Authentication & Authorization (JwtAuthGuard)       │
└────────────────────────┬───────────────────────────────┘
                         │ (Validated DTO)
                         ▼
┌────────────────────────────────────────────────────────┐
│  Domain & Business Logic Layer (Services)              │
│  - Order State Machine (assertTransition)              │
│  - Idempotency Checker                                 │
│  - Concurrency Control (Optimistic Locking)            │
│  - Loyalty Calculations                                │
└────────────────────────┬───────────────────────────────┘
                         │ (Domain Entities / Data Queries)
                         ▼
┌────────────────────────────────────────────────────────┐
│  Data Persistence Layer (Prisma ORM & Repositories)    │
│  - Prisma Client transactions ($transaction)           │
│  - Schema Mapping & Type-safe query engine             │
└────────────────────────┬───────────────────────────────┘
                         │ (SQL / Connection Pool)
                         ▼
┌────────────────────────────────────────────────────────┐
│  PostgreSQL Database Engine                            │
│  (Persistent Storage & Foreign Key Constraints)        │
└────────────────────────────────────────────────────────┘
```

### 2.1. Tầng Trình bày (Presentation / Controller Layer)
* **Nhiệm vụ:** Tiếp nhận request từ client, kiểm soát luồng giao tiếp, chuyển giao dữ liệu xuống tầng nghiệp vụ và trả về HTTP response có định dạng chuẩn.
* **Thành phần:**
  * **Controllers:** `ProductsController`, `OrdersController`, `PaymentsController`, `AuthController`.
  * **Pipes:** Tích hợp toàn cục `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` nhằm sàng lọc và bóc tách các payload không hợp lệ.
  * **Guards & Strategies:** Passport-JWT Guard bảo vệ các route nhạy cảm như tạo đơn hàng (`POST /orders`) và xem lịch sử đơn (`GET /orders/me`).

### 2.2. Tầng Nghiệp vụ cốt lõi (Domain / Business Logic Layer)
* **Nhiệm vụ:** Đảm nhiệm toàn bộ logic kinh doanh mà không phụ thuộc vào hạ tầng hay giao thức HTTP.
* **Các cơ chế trọng tâm:**
  1. **Order State Machine (Máy trạng thái đơn hàng):**
     * Thực thi quy tắc chuyển tiếp trạng thái hợp lệ:
       $$\text{PENDING} \rightarrow \text{PAID} \rightarrow \text{PREPARING} \rightarrow \text{READY} \rightarrow \text{COMPLETED}$$
     * Xử lý ngoại lệ: $\text{PENDING} \rightarrow \text{PAYMENT\_FAILED}$ hoặc $\text{CANCELLED}$.
     * Chặn chuyển đổi trạng thái trái phép bằng hàm xác thực `assertTransition(currentStatus, targetStatus)`.
  2. **Xử lý Thanh toán Idempotent (Idempotency Control):**
     * Tiếp nhận trường `Idempotency-Key` từ HTTP header của yêu cầu `POST /payments`.
     * Kiểm tra bản ghi trong bảng `payments`. Nếu transaction key đã thành công trước đó, trả về ngay trạng thái mà không trừ tiền hay cập nhật đơn hàng lần hai.
  3. **Kiểm soát Tồn kho Đồng thời (Concurrency & Inventory Protection):**
     * Khi nhiều đơn hàng được xử lý cùng lúc, áp dụng cơ chế **Optimistic Locking** thông qua trường `version` trong bảng `products`. 
     * Sử dụng khối `prisma.$transaction()` để đảm bảo thao tác trừ tồn kho và tạo bản ghi chi tiết đơn hàng là nguyên tử (atomic).
  4. **Tích điểm thưởng (Loyalty Program):**
     * Tự động tính toán và cộng điểm thưởng tích lũy cho bảng `users` ngay khi đơn hàng chuyển sang trạng thái `PAID`.

### 2.3. Tầng Dữ liệu và Truy cập (Data Access Layer - Prisma ORM)
* **Nhiệm vụ:** Cầu nối dữ liệu giữa thực thể mã nguồn và hệ quản trị cơ sở dữ liệu PostgreSQL.
* **Cơ chế hoạt động:**
  * Toàn bộ cấu trúc bảng, khóa chính, khóa ngoại, chỉ mục (Index) được khai báo tại `prisma/schema.prisma`.
  * Thay đổi cấu trúc cơ sở dữ liệu được quản lý nghiêm ngặt bằng tệp migration sinh tự động (`npx prisma migrate dev`), cam kết không sửa trực tiếp database ở môi trường production.

---

## 3. Kiến trúc Frontend (`apps/web` - Next.js / PWA)

Ứng dụng Frontend được xây dựng dựa trên Next.js 14+ sử dụng App Router, hướng đến phong cách thiết kế **Mobile-First Responsive** và khả năng cài đặt như một ứng dụng web lũy tiến (PWA).

* **Quản lý trạng thái (Client State):**
  * Sử dụng **Zustand** để duy trì trạng thái giỏ hàng (`CartStore`).
  * Trạng thái giỏ hàng bao gồm: danh sách sản phẩm đã chọn, kích thước (Size S/M/L), danh sách topping, số lượng và tổng tiền tạm tính.
  * Giỏ hàng được đồng bộ cục bộ (`localStorage`) để bảo toàn khi người dùng reload trang hoặc khi gặp sự cố thanh toán (`PAYMENT_FAILED`).
* **Chiến lược nạp dữ liệu (Data Fetching):**
  * Trang Menu (`/`): Sử dụng Server-Side Rendering (SSR) hoặc Incremental Static Regeneration (ISR) với revalidate định kỳ để tối ưu hóa thời gian phản hồi đạt tiêu chí $API < 500\text{ ms}$.
  * Màn hình Đơn hàng & Thanh toán: Thực thi phía Client thông qua React Hooks, hiển thị đầy đủ các trạng thái `LoadingSkeleton`, `EmptyState` và `ErrorBanner`.

---

## 4. Dịch vụ Thanh toán Mô phỏng (Mock Payment Service)

Do phạm vi đồ án học tập, BrewLite tích hợp dịch vụ thanh toán mô phỏng (Mock Gateway) được đóng gói trong `PaymentsModule`:

```text
[ Client ] ── POST /payments (Idempotency-Key: <UUID>) ──► [ NestJS API ]
                                                                 │
                                                    Kiểm tra Idempotency Key?
                                                    ├── Đã tồn tại & Thành công ──► Trả về kết quả cũ
                                                    └── Chưa tồn tại:
                                                             │
                                                             ▼
                                                    [ Mock Gateway Service ]
                                                    - Mô phỏng độ trễ mạng (500-1000ms)
                                                    - Xử lý xác nhận thành công / lỗi
                                                             │
                                            ┌────────────────┴────────────────┐
                                            ▼                                 ▼
                                      [ Thành công ]                    [ Thất bại ]
                                      - Status: PAID                    - Status: PAYMENT_FAILED
                                      - Cộng loyalty points             - Giữ nguyên giỏ hàng
                                      - Lưu Idempotency record          - Cho phép thử lại
```

---

## 5. Giám sát, Health Check và Quản lý Cấu hình

1. **Quản lý Cấu hình (Configuration Management):**
   * Sử dụng `@nestjs/config` và kiểm tra kiểu dữ liệu biến môi trường bằng `Joi`.
   * Cung cấp tệp `.env.example` chuẩn cho dự án. Tuyệt đối không commit các khóa bí mật (`JWT_SECRET`, mật khẩu CSDL) lên kho lưu trữ.
2. **Health Check Endpoint:**
   * Cung cấp endpoint tiêu chuẩn `GET /health` sử dụng module `@nestjs/terminus`.
   * Kiểm tra trực tiếp trạng thái kết nối tới PostgreSQL (`PrismaHealthIndicator`) và dung lượng bộ nhớ.
3. **Structured Logging:**
   * Ghi log có cấu trúc tại tầng Controller và Service cho các sự kiện: khởi động ứng dụng, lỗi chuyển trạng thái (State transition failure), lỗi thanh toán và vi phạm validation.

---

## 6. Phân tích Đánh đổi Kiến trúc (Architectural Trade-offs)

| Tiêu chí | Quyết định được chọn | Ưu điểm | Đánh đổi / Thách thức |
| :--- | :--- | :--- | :--- |
| **Cấu trúc Repository** | Monorepo | Đồng bộ tài liệu, backend và frontend trong cùng commit/PR; dễ truy vết. | Cần cấu hình CI thông minh để tránh chạy lại pipeline khi chỉ sửa tài liệu. |
| **Giao tiếp Hệ thống** | RESTful API over HTTPS | Đơn giản, dễ debug, chuẩn hóa theo quy chuẩn chung của Web API. | Không hỗ trợ hai chiều thời gian thực tự nhiên như WebSocket (cần polling cho trạng thái đơn). |
| **Data Access** | Prisma ORM | Type-safety tuyệt đối, tự động sinh TypeScript types, quản lý migration rõ ràng. | Kém linh hoạt hơn raw SQL đối với các truy vấn tổng hợp phức tạp (phải dùng `$queryRaw`). |
| **Kiểm soát đồng thời** | Optimistic Locking | Hiệu năng cao, không gây tình trạng deadlock database khi đọc nhiều. | Request sau cùng sẽ bị từ chối nếu có xung đột phiên bản, đòi hỏi UI xử lý báo lỗi khéo léo. |