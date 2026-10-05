# 🌟 Bé Code Vui - Học Lập Trình Qua Trò Chơi

> Webapp giáo dục cho trẻ em 6 tuổi, giúp phát triển tư duy lập trình và toán học qua các trò chơi vui nhộn, sinh động.

## ✨ Tính năng nổi bật

- 🎮 **19 trò chơi** đa dạng (logic, trí nhớ, lập trình, toán, âm nhạc)
- 🏆 **5 cấp độ rõ ràng** (Stage 1-5): Khởi Đầu 🌱 → Tập Sự 🌿 → Thành Thạo 🌳 → Thử Thách 🔥 → Huyền Thoại 👑
- ⚙️ **3 chế độ chơi** (Dễ, Vừa, Khó) với hệ số thời gian khác nhau
- 📈 **100 level** cho mỗi chế độ (tổng cộng 1500 level)
- ⭐ **Hệ thống điểm sao** (1-3 sao) dựa trên độ chính xác + tốc độ
- 💾 **Lưu game** - chơi dở và quay lại sau
- 📊 **Lịch sử chơi** - xem lại các level đã hoàn thành
- 🔊 **Âm thanh** Web Audio API phản hồi vui nhộn
- 🎨 **Animation mượt mà** với Framer Motion
- 🎹 **Game Piano** với 7 nốt nhạc thật
- 📚 **Game Toán tư duy** phong cách FMO/HKIMO

## 🎮 Danh sách 19 trò chơi

### Logic & Suy luận
| # | Trò chơi | Emoji | Mô tả |
|---|----------|-------|-------|
| 1 | Tìm Quy Luật | 🧩 | Tìm hình còn thiếu trong dãy |
| 2 | Ghép Màu | 🎨 | Điền màu/emoji còn thiếu |
| 3 | Đọc Chỉ Dẫn | 🎯 | Tìm chuỗi mũi tên giống hệt |
| 4 | Ghép Bóng | 🪞 | Phản chiếu - xoay/lật hình |
| 5 | Xếp Theo Thứ Tự | 📊 | Sắp xếp theo quy luật |
| 6 | Mini Sudoku 4×4 | 🧩 | Điền số 1-4 theo quy luật |
| 7 | Suy Luận Logic | 🧠 | Đúng/sai, hình khác, số sai |
| 8 | Hình Logic | 🔷 | Đếm đỉnh, xoay, đối xứng |

### Trí nhớ
| # | Trò chơi | Emoji | Mô tả |
|---|----------|-------|-------|
| 9 | Ghi Nhớ Chuỗi | 🎵 | Nhớ và lặp lại chuỗi âm thanh |

### Lập trình
| # | Trò chơi | Emoji | Mô tả |
|---|----------|-------|-------|
| 10 | Robot Tìm Đường | 🧭 | Lập trình robot đi đến đích |
| 11 | Tìm Con Bọ | 🐞 | Tìm lỗi sai trong chương trình |

### Toán học
| # | Trò chơi | Emoji | Mô tả |
|---|----------|-------|-------|
| 12 | Dãy Số Bí Ẩn | 🔢 | Tìm số tiếp theo (Fibonacci, lũy thừa) |
| 13 | Đếm & So Sánh | 🧮 | Đếm, so sánh, tính toán |
| 14 | Toán Có Lời Văn | 📚 | Bài toán tình huống thực tế |
| 15 | So Sánh Số | ⚖️ | So sánh, max/min, tổng |
| 16 | Dãy Số Toán | 🔢 | Số ở giữa, số thiếu, số chẵn/lẻ |

### Âm nhạc
| # | Trò chơi | Emoji | Mô tả |
|---|----------|-------|-------|
| 17 | Nhạc Trưởng Nhí | 🎹 | Chơi piano theo giai điệu |

## 🏆 Hệ thống 5 Cấp độ (Stage)

| Stage | Phạm vi | Emoji | Đặc điểm |
|-------|---------|-------|----------|
| 1 | Level 1-10 | 🌱 Khởi Đầu | Rất cơ bản, thời gian dài |
| 2 | Level 11-20 | 🌿 Tập Sự | Nâng cao một chút |
| 3 | Level 21-30 | 🌳 Thành Thạo | Trung bình, cân bằng |
| 4 | Level 31-40 | 🔥 Thử Thách | Khó, thời gian ngắn |
| 5 | Level 41-50 | 👑 Huyền Thoại | Rất khó, dành cho bậc thầy |

*(Mỗi trò chơi có 100 level, chia thành 5 stage × 20 level)*

## 🚀 Cài đặt và Chạy

```bash
# Cài dependencies
npm install

# Dev server
npm run dev

# Build cho production
npm run build
```

Build sẽ tạo file `dist/index.html` đã được inline toàn bộ JS/CSS (single-file build), sẵn sàng deploy.

## 🌐 Hướng dẫn Deploy lên GitHub Pages

### Bước 1: Tạo Repository trên GitHub
1. Đăng nhập vào [GitHub](https://github.com)
2. Nhấn **New Repository**
3. Đặt tên repo: `be-code-vui` (hoặc tên bạn muốn)
4. Chọn **Public**
5. Nhấn **Create repository**

### Bước 2: Push Code lên GitHub

```bash
# Trong thư mục dự án
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/be-code-vui.git
git push -u origin main
```

### Bước 3: Cấu hình GitHub Pages

**Cách 1: Dùng GitHub Actions (khuyến nghị - tự động build)**

Tạo file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Sau đó:
1. Push file workflow lên GitHub
2. Vào **Settings** → **Pages**
3. Source: chọn **GitHub Actions**
4. Đợi workflow chạy xong (khoảng 1-2 phút)

**Cách 2: Deploy thủ công**

```bash
# Build
npm run build

# Commit dist folder
git add dist -f
git commit -m "Build dist"
git subtree push --prefix dist origin gh-pages
```

Sau đó trong GitHub:
1. Vào **Settings** → **Pages**
2. Source: chọn branch `gh-pages`, folder `/ (root)`
4. Đợi vài phút, web sẽ có tại: `https://YOUR_USERNAME.github.io/be-code-vui/`

### Bước 4: Truy cập web

Sau khi deploy xong, web sẽ có tại:
```
https://YOUR_USERNAME.github.io/be-code-vui/
```

## 📚 Công nghệ sử dụng

- **React 19** + **Vite 7** - Framework hiện đại, build nhanh
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Styling utility-first
- **Framer Motion** - Animation
- **Web Audio API** - Âm thanh piano real-time
- **LocalStorage** - Lưu game progress

## 🎓 Hướng đến

- 👶 **Trẻ 6 tuổi** tập làm quen tư duy lập trình
- 🧠 **Phát triển tư duy logic**, toán học, suy luận
- 🎯 **Học qua chơi** - vui vẻ, không áp lực
- 🏠 **Phụ huynh & giáo viên** sử dụng làm công cụ giáo dục

## 📄 Giấy phép

Made with 💜 cho trẻ em Việt Nam