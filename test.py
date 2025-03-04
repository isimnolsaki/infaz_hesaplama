import requests
import json
from pprint import pprint

BASE_URL = "http://127.0.0.1:5000"

def test_case(name, data):
    print(f"\n{'=' * 50}")
    print(f"TEST: {name}")
    print(f"{'=' * 50}")
    
    try:
        response = requests.post(f"{BASE_URL}/hesapla", json=data)
        if response.status_code == 200:
            result = response.json()
            pprint(result)
            return result
        else:
            print(f"Hata: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"İstek hatası: {str(e)}")
        return None

# Test Senaryoları

# 1. Standart Süreli Hapis Cezası (Diğer Suçlar)
test_case("Standart Süreli Hapis Cezası (Diğer Suçlar)", {
    "dogum_tarihi": "1980-01-01",
    "suc_tarihi": "2022-01-01",
    "ceza_turu": "Süreli Hapis",
    "suc_turu": "Diğer Suçlar",
    "ceza_yil": 10,
    "ceza_ay": 0,
    "cocuk_var": False,
    "agir_hastalik": False,
    "tekerrur": False,
    "ikinci_mukerrir": False
})

# 2. Tekerrür Durumu
test_case("Tekerrür Durumunda Süreli Hapis Cezası", {
    "dogum_tarihi": "1980-01-01",
    "suc_tarihi": "2022-01-01",
    "ceza_turu": "Süreli Hapis",
    "suc_turu": "Diğer Suçlar",
    "ceza_yil": 10,
    "ceza_ay": 0,
    "cocuk_var": False,
    "agir_hastalik": False,
    "tekerrur": True,
    "ikinci_mukerrir": False
})

# 3. İkinci Mükerrir Durumu
test_case("İkinci Mükerrir Durumunda Süreli Hapis Cezası", {
    "dogum_tarihi": "1980-01-01",
    "suc_tarihi": "2022-01-01",
    "ceza_turu": "Süreli Hapis",
    "suc_turu": "Diğer Suçlar",
    "ceza_yil": 10,
    "ceza_ay": 0,
    "cocuk_var": False,
    "agir_hastalik": False,
    "tekerrur": True,
    "ikinci_mukerrir": True
})

# 4. Müebbet Hapis Cezası
test_case("Müebbet Hapis Cezası", {
    "dogum_tarihi": "1980-01-01",
    "suc_tarihi": "2022-01-01",
    "ceza_turu": "Müebbet Hapis",
    "suc_turu": "Diğer Suçlar",
    "ceza_yil": 0,
    "ceza_ay": 0,
    "cocuk_var": False,
    "agir_hastalik": False,
    "tekerrur": False,
    "ikinci_mukerrir": False
})

# 5. Ağırlaştırılmış Müebbet Hapis Cezası
test_case("Ağırlaştırılmış Müebbet Hapis Cezası", {
    "dogum_tarihi": "1980-01-01",
    "suc_tarihi": "2022-01-01",
    "ceza_turu": "Ağırlaştırılmış Müebbet",
    "suc_turu": "Diğer Suçlar",
    "ceza_yil": 0,
    "ceza_ay": 0,
    "cocuk_var": False,
    "agir_hastalik": False,
    "tekerrur": False,
    "ikinci_mukerrir": False
})

# 6. Terör Suçları
test_case("Terör Suçları", {
    "dogum_tarihi": "1980-01-01",
    "suc_tarihi": "2022-01-01",
    "ceza_turu": "Süreli Hapis",
    "suc_turu": "Terör Suçları",
    "ceza_yil": 10,
    "ceza_ay": 0,
    "cocuk_var": False,
    "agir_hastalik": False,
    "tekerrur": False,
    "ikinci_mukerrir": False
})

# 7. Kasten Öldürme
test_case("Kasten Öldürme", {
    "dogum_tarihi": "1980-01-01",
    "suc_tarihi": "2022-01-01",
    "ceza_turu": "Süreli Hapis",
    "suc_turu": "Kasten Öldürme",
    "ceza_yil": 20,
    "ceza_ay": 0,
    "cocuk_var": False,
    "agir_hastalik": False,
    "tekerrur": False,
    "ikinci_mukerrir": False
})

# 8. Çocuk Var
test_case("0-6 Yaş Çocuğu Olan Kadın Hükümlü", {
    "dogum_tarihi": "1980-01-01",
    "suc_tarihi": "2022-01-01",
    "ceza_turu": "Süreli Hapis",
    "suc_turu": "Diğer Suçlar",
    "ceza_yil": 10,
    "ceza_ay": 0,
    "cocuk_var": True,
    "agir_hastalik": False,
    "tekerrur": False,
    "ikinci_mukerrir": False
})

# 9. Ağır Hastalık
test_case("Ağır Hastalık Durumu", {
    "dogum_tarihi": "1980-01-01",
    "suc_tarihi": "2022-01-01",
    "ceza_turu": "Süreli Hapis",
    "suc_turu": "Diğer Suçlar",
    "ceza_yil": 10,
    "ceza_ay": 0,
    "cocuk_var": False,
    "agir_hastalik": True,
    "tekerrur": False,
    "ikinci_mukerrir": False
})

# 10. COVID-19 Öncesi
test_case("COVID-19 Öncesi Suç (30/03/2020 Öncesi)", {
    "dogum_tarihi": "1980-01-01",
    "suc_tarihi": "2020-01-01",
    "ceza_turu": "Süreli Hapis",
    "suc_turu": "Diğer Suçlar",
    "ceza_yil": 10,
    "ceza_ay": 0,
    "cocuk_var": False,
    "agir_hastalik": False,
    "tekerrur": False,
    "ikinci_mukerrir": False
})

# 11. Genç Yaş (15-18)
test_case("15-18 Yaş Arası Hükümlü", {
    "dogum_tarihi": "2005-01-01",
    "suc_tarihi": "2022-01-01",
    "ceza_turu": "Süreli Hapis",
    "suc_turu": "Diğer Suçlar",
    "ceza_yil": 10,
    "ceza_ay": 0,
    "cocuk_var": False,
    "agir_hastalik": False,
    "tekerrur": False,
    "ikinci_mukerrir": False
})

# 12. Çok Genç Yaş (12-15)
test_case("12-15 Yaş Arası Hükümlü", {
    "dogum_tarihi": "2008-01-01",
    "suc_tarihi": "2022-01-01",
    "ceza_turu": "Süreli Hapis",
    "suc_turu": "Diğer Suçlar",
    "ceza_yil": 10,
    "ceza_ay": 0,
    "cocuk_var": False,
    "agir_hastalik": False,
    "tekerrur": False,
    "ikinci_mukerrir": False
}) 