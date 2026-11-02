# BrewLite Monorepo

Dự án BrewLite bao gồm NestJS backend và Next.js frontend trong kiến trúc Monorepo.

## 1. Cấu trúc Repository
- `apps/api`: NestJS API Backend kết nối PostgreSQL qua Prisma.
- `apps/web`: Next.js Frontend (App Router, Zustand store).
- `docs/`: Tài liệu kiến trúc và hướng dẫn dự án.

## 2. Chiến lược Branch & Pull Request (Git Flow rút gọn)
- `main`: Nhánh production ổn định, chỉ merge thông qua Pull Request có review.
- `dev`: Nhánh tích hợp chính cho các tính năng trong Sprint.
- Nhánh tính năng: Đặt tên theo quy ước `feature/<tên-người-thực-hiện>-<tên-task>` (VD: `feature/khoi-setup-repo`).
- Quy trình PR: Mọi PR vào `dev` hoặc `main` phải qua build kiểm tra và được ít nhất 1 thành viên approve.

## 3. Quy ước Commit (Conventional Commits)
Định dạng: `<loại>(<phạm vi>): <mô tả ngắn>`
- `feat`: Tính năng mới (VD: `feat(api): implement get products route`)
- `fix`: Sửa lỗi (VD: `fix(web): resolve duplicate app folder issue`)
- `docs`: Cập nhật tài liệu (VD: `docs: update README with branch strategy`)
- `chore`: Cập nhật cấu hình, dependencies (VD: `chore: add .env.example`)

## 4. Definition of Done (DoD)
Một task/User Story được coi là hoàn thành (Done) khi:
1. Mã nguồn được viết hoàn chỉnh theo đúng yêu cầu đề bài.
2. Không còn lỗi biên dịch (TypeScript check 0 errors).
3. Đã chạy thử nghiệm thực tế (Backend chạy đúng endpoint, Frontend hiển thị đúng).
4. Code tuân thủ quy ước đặt tên và đã qua review trong PR.
5. Code đã được merge vào nhánh chính (`develop`/`main`).