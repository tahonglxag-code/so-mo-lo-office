import { strict as kiemTra } from 'node:assert';
import { dinhDangLichSuMaSoi } from '../public/ma-soi-lich-su.js';

const lichSuMau=[
  {
    "loai": "phan-vai",
    "nguoi": [
      {
        "ten": "An",
        "vai": "Ma Sói",
        "phe": "Sói"
      },
      {
        "ten": "Bình",
        "vai": "Tiên tri",
        "phe": "Dân"
      }
    ],
    "capDoi": [
      [
        "An",
        "Bình"
      ]
    ]
  },
  {
    "loai": "dem",
    "ngay": 1,
    "cupid": [
      "An",
      "Bình"
    ],
    "baoVe": "Bình",
    "soi": "An",
    "soiDongThuan": true,
    "luaChonSoi": [
      {
        "soi": "An",
        "mucTieu": "Bình"
      }
    ],
    "tienTri": "An",
    "ketQuaSoi": "SÓI",
    "phuThuy": {
      "loai": "skip",
      "nguoi": "",
      "hieuQua": false
    },
    "thoSan": "",
    "thoSanBan": "",
    "boQua": [
      "hunter"
    ],
    "boQuaChiTiet": [
      {
        "vai": "hunter",
        "lyDo": "khong-bi-soi-can"
      }
    ]
  },
  {
    "loai": "chet",
    "nguoi": [
      {
        "ten": "Bình",
        "nguyenNhan": "wolf"
      },
      {
        "ten": "An",
        "nguyenNhan": "cupid"
      }
    ]
  },
  {
    "loai": "ket-qua-dem",
    "chet": [
      "Bình",
      "An"
    ]
  },
  {
    "loai": "chet",
    "nguoi": [
      {
        "ten": "Bình",
        "nguyenNhan": "vote"
      }
    ]
  },
  {
    "loai": "vote",
    "ngay": 1,
    "phieu": [
      {
        "from": "An",
        "to": "Bình"
      },
      {
        "from": "Bình",
        "to": "Trắng"
      },
      {
        "from": "Cá",
        "to": "Bình"
      }
    ],
    "chet": [
      "Bình"
    ],
    "hoa": false
  },
  {
    "loai": "vote",
    "ngay": 2,
    "phieu": [
      {
        "from": "An",
        "to": "Cá"
      },
      {
        "from": "Cá",
        "to": "An"
      }
    ],
    "chet": [],
    "hoa": true
  },
  {
    "loai": "ket-qua",
    "pheThang": "villagers",
    "soNgay": 2,
    "nguoiThang": [
      "An"
    ],
    "nguoiThua": [],
    "nguoiSong": [
      "An"
    ],
    "nguoiChet": [
      "Bình",
      "Cá"
    ]
  }
];
const noiDung=dinhDangLichSuMaSoi(lichSuMau);
kiemTra.equal(noiDung.includes('"loai"'),false);
kiemTra.equal(noiDung.includes('"at"'),false);
kiemTra.ok(noiDung.includes("I. PHÂN VAI"));
kiemTra.ok(noiDung.includes("II. ĐÊM 1"));
kiemTra.ok(noiDung.includes("III. NGÀY 1"));
kiemTra.ok(noiDung.includes("Bình: 2 phiếu"));
kiemTra.ok(noiDung.includes("hòa phiếu, không ai bị loại"));
kiemTra.ok(noiDung.includes("nguyên nhân"));
kiemTra.ok(noiDung.includes("V. KẾT QUẢ CUỐI CÙNG"));
kiemTra.equal(noiDung.includes("180 giây"),false);
console.log("PASS: lich su Ma Soi duoc dinh dang thanh noi dung de doc");
