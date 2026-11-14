const gheNgoi = [
  { x: -1.6, z: -1.2, yaw: Math.PI },
  { x: 0, z: -1.2, yaw: Math.PI },
  { x: 1.6, z: -1.2, yaw: Math.PI },
  { x: 1.6, z: 1.2, yaw: 0 },
  { x: 0, z: 1.2, yaw: 0 },
  { x: -1.6, z: 1.2, yaw: 0 }
];

const choTrong = [
  { x: -.8, z: -1.2 },
  { x: .8, z: -1.2 },
  { x: .8, z: 1.2 },
  { x: -.8, z: 1.2 },
  { x: -2.55, z: 0 },
  { x: 2.55, z: 0 }
];

export function taoChoHopGap(soNguoi, tamX = 14.5, tamZ = 5.1) {
  const soCho = Math.max(0, Math.min(50, Math.floor(Number(soNguoi) || 0)));
  const viTri = gheNgoi.map(cho => ({ ...cho, dangNgoi: true }));
  for (const cho of choTrong) viTri.push({ ...cho, dangNgoi: false });
  for (let lop = 0; viTri.length < soCho && lop < 4; lop++) {
    const rx = 2.55 + lop * .48;
    const rz = 1.9 + lop * .42;
    const chuVi = 2 * Math.PI * Math.sqrt((rx * rx + rz * rz) / 2);
    const soDiem = Math.ceil(chuVi / .72);
    for (let i = 0; i < soDiem && viTri.length < soCho; i++) {
      const goc = 2 * Math.PI * (i + .31 + lop % 2 * .5) / soDiem;
      const ungVien = { x: rx * Math.cos(goc), z: rz * Math.sin(goc) };
      if (viTri.some(cho => Math.hypot(cho.x - ungVien.x, cho.z - ungVien.z) < .68)) continue;
      viTri.push({ ...ungVien, dangNgoi: false });
    }
  }
  return viTri.slice(0, soCho).map(cho => ({
    x: tamX + cho.x,
    z: tamZ + cho.z,
    yaw: Number.isFinite(cho.yaw) ? cho.yaw : Math.atan2(cho.x, cho.z),
    dangNgoi: cho.dangNgoi
  }));
}
