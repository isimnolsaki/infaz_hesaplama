# İnfaz Hesaplama Uygulaması

Bu uygulama, Türk Ceza Kanunu ve İnfaz Kanunu'na göre hapis cezası sürelerini hesaplayan bir web uygulamasıdır.

## Özellikler

- Süreli hapis, müebbet hapis ve ağırlaştırılmış müebbet hapis cezalarını hesaplama
- Farklı suç türlerine göre infaz hesaplama (kasten öldürme, terör suçları, cinsel suçlar vb.)
- 7242 sayılı yasa kapsamında 30/03/2020 öncesi ve sonrası suçlar için hesaplama
- Tekerrür (mükerrir) durumlarını dikkate alan hesaplama
- 0-6 yaş arası çocuğu olan kadın hükümlüler ve ağır hastalık durumlarında ek süre hesaplama
- Yaş gruplarına göre infaz oranı hesaplama (12-15 yaş, 15-18 yaş)
- **Hükmün kesinleştiği tarihe göre koşullu salıverilme ve denetimli serbestlik tarihlerini hesaplama**

## Kurulum

```bash
# Projeyi indirin
git clone https://github.com/KULLANICI_ADI/infaz_hesaplama.git
cd infaz_hesaplama

# Gerekli paketleri yükleyin
pip install -r requirements.txt

# Uygulamayı başlatın
python app.py
```

## Kullanım

1. Tarayıcınızda `http://127.0.0.1:5000` adresine gidin
2. Hükümlü bilgilerini girin (doğum tarihi, suç tarihi, ceza türü, suç türü, ceza süresi vb.)
3. "Hesapla" butonuna tıklayın
4. Hesaplama sonuçlarını görüntüleyin

## Hesaplama Yöntemi

- **Koşullu Salıverilme**: Toplam ceza süresinin, suç türüne göre belirlenen bir oranı kadar hapis yattıktan sonra tahliye olanağı
- **Denetimli Serbestlik**: Koşullu salıverilme tarihinden belirli süre önce (1 veya 2 yıl) denetim şartıyla tahliye olanağı

## İnfaz Hesaplama Formülü

- **Toplam Ceza Süresi (T)**: Suç için verilen toplam hapis süresi
- **Koşullu Salıverilme Oranı (K)**: Suç türüne göre belirlenen oran (1/2, 2/3, 3/4 vb.)
- **Koşullu Salıverilme Süresi**: T × K
- **Denetimli Serbestlik Süresi (D)**: Suç türüne göre 1 veya 2 yıl, duruma göre +6 ay ek süre
- **Koşullu Salıverilme Tarihi**: Hükmün Kesinleştiği Tarih + Koşullu Salıverilme Süresi
- **Denetimli Serbestlik Tarihi**: Koşullu Salıverilme Tarihi - Denetimli Serbestlik Süresi

## Test Senaryoları

Farklı senaryolar ve hesaplama sonuçları için `test_results.md` dosyasına bakabilirsiniz.

## Yasal Uyarı

Bu uygulama sadece bilgilendirme amaçlıdır ve kesin hukuki sonuçlar doğurmaz. Gerçek durumlar için bir avukata danışmanız önerilir. 
