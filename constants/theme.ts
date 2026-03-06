// BỘ NHẬN DIỆN THƯƠNG HIỆU IPAVIET (CHUẨN APPLE)
export const COLORS = {
  background: '#000000', // Đen tuyền tuyệt đối (Giúp tiết kiệm pin màn OLED)
  surface: '#1c1c1e', // Màu xám đen của các thẻ (Card)
  primary: '#007aff', // Xanh dương đặc trưng của nút bấm Apple
  warning: '#FFD60A', // Vàng Gold cực sang cho khu vực VIP
  text: '#FFFFFF', // Chữ trắng tinh
  textMuted: '#8e8e93', // Chữ xám phụ (Ngày tháng, mô tả)
  border: '#38383A', // Viền mờ
};

export const SIZES = {
  padding: 20, // Khoảng cách lề chuẩn
  radiusCard: 24, // Độ bo góc sâu cho thẻ App
  radiusButton: 16, // Độ bo góc cho nút bấm
};

export const SHADOWS = {
  // Bóng đổ tạo cảm giác thẻ App nổi bồng bềnh lên khỏi màn hình
  glow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  }
};