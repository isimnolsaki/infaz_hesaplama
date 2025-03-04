// DOM yüklendikten sonra çalış
document.addEventListener('DOMContentLoaded', function() {
    // Form elementlerine erişim
    const form = document.getElementById('infazForm');
    const cezaTuruSelect = document.getElementById('cezaTuru');
    const sucTuruSelect = document.getElementById('sucTuru');
    const cezaSuresiDiv = document.getElementById('cezaSuresiDiv');
    const sonucDiv = document.getElementById('sonuc');
    const tekerrurCheckbox = document.getElementById('tekerrur');
    const ikinciMukerrirCheckbox = document.getElementById('ikinciMukerrir');
    
    // Ceza türü değişince ceza süresi alanını göster/gizle
    cezaTuruSelect.addEventListener('change', function() {
        if (this.value === 'Süreli Hapis') {
            cezaSuresiDiv.style.display = 'block';
        } else {
            cezaSuresiDiv.style.display = 'none';
        }
    });
    
    // İkinci mükerrir seçilince, normal tekerrür otomatik seçilsin
    ikinciMukerrirCheckbox.addEventListener('change', function() {
        if (this.checked) {
            tekerrurCheckbox.checked = true;
        }
    });
    
    // Form submit işlemi
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Tarih değerlerini al
        const dogumGun = document.getElementById('dogumGun').value;
        const dogumAy = document.getElementById('dogumAy').value;
        const dogumYil = document.getElementById('dogumYil').value;
        const sucGun = document.getElementById('sucGun').value;
        const sucAy = document.getElementById('sucAy').value;
        const sucYil = document.getElementById('sucYil').value;
        const kesinlesmeGun = document.getElementById('kesinlesmeGun').value;
        const kesinlesmeAy = document.getElementById('kesinlesmeAy').value;
        const kesinlesmeYil = document.getElementById('kesinlesmeYil').value;

        // Tarih doğrulamaları
        if (!validateDate(dogumGun, dogumAy, dogumYil)) {
            alert('Lütfen geçerli bir doğum tarihi girin.');
            return;
        }

        if (!validateDate(sucGun, sucAy, sucYil)) {
            alert('Lütfen geçerli bir suç tarihi girin.');
            return;
        }

        if (!validateDate(kesinlesmeGun, kesinlesmeAy, kesinlesmeYil)) {
            alert('Lütfen geçerli bir hükmün kesinleştiği tarih girin.');
            return;
        }

        // Kesinleşme tarihi suç tarihinden önce olamaz kontrolü
        const sucTarihi = new Date(sucYil, sucAy - 1, sucGun);
        const kesinlesmeTarihi = new Date(kesinlesmeYil, kesinlesmeAy - 1, kesinlesmeGun);
        
        if (kesinlesmeTarihi < sucTarihi) {
            alert('Hükmün kesinleştiği tarih, suç tarihinden önce olamaz.');
            return;
        }

        // Ceza türü kontrolü
        const cezaTuru = document.getElementById('cezaTuru').value;
        if (!cezaTuru) {
            alert('Lütfen bir ceza türü seçin.');
            return;
        }

        // Süreli hapis için ceza süresi kontrolü
        const cezaYil = document.getElementById('cezaYil').value || "0";
        const cezaAy = document.getElementById('cezaAy').value || "0";
        if (cezaTuru === 'Süreli Hapis' && parseInt(cezaYil) === 0 && parseInt(cezaAy) === 0) {
            alert('Lütfen ceza süresini girin.');
            return;
        }

        // Form verilerini topla
        const formData = {
            dogum_tarihi: `${dogumYil}-${padZero(dogumAy)}-${padZero(dogumGun)}`,
            suc_tarihi: `${sucYil}-${padZero(sucAy)}-${padZero(sucGun)}`,
            kesinlesme_tarihi: `${kesinlesmeYil}-${padZero(kesinlesmeAy)}-${padZero(kesinlesmeGun)}`,
            ceza_turu: cezaTuru,
            suc_turu: document.getElementById('sucTuru').value,
            ceza_yil: parseInt(cezaYil),
            ceza_ay: parseInt(cezaAy),
            cocuk_var: document.getElementById('cocukVar').checked,
            agir_hastalik: document.getElementById('agirHastalik').checked,
            tekerrur: document.getElementById('tekerrur').checked,
            ikinci_mukerrir: document.getElementById('ikinciMukerrir').checked
        };

        // Hesapla butonunu devre dışı bırak ve "Hesaplanıyor..." metni göster
        const submitButton = document.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Hesaplanıyor...';
        
        // Sonuç alanını temizle ve yükleniyor göster
        sonucDiv.innerHTML = '<div class="text-center my-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Hesaplanıyor, lütfen bekleyin...</p></div>';

        // API isteği gönder
        fetch('/hesapla', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            // Hesapla butonunu aktif et
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            
            // Sonuçları göster
            displayResults(data);
        })
        .catch(error => {
            // Hata durumunda
            console.error('Hata:', error);
            
            // Hesapla butonunu aktif et
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            
            // Hata mesajını göster
            sonucDiv.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading">Hesaplama hatası!</h4>
                    <p>Hesaplama yapılırken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.</p>
                    <hr>
                    <p class="mb-0">Hata detayı: ${error.message || 'Bilinmeyen hata'}</p>
                </div>
            `;
        });
    });
    
    // Sonuçları göster
    function displayResults(result) {
        const sonucDiv = document.getElementById('sonuc');
        
        // Temel bilgileri içeren card oluştur
        let html = `
            <div class="card mb-4">
                <div class="card-header bg-primary text-white">
                    <h3 class="mb-0">İnfaz Hesaplama Sonucu</h3>
                </div>
                <div class="card-body">
                    <div class="result-section">
                        <h4>Temel Bilgiler</h4>
                        <div class="row">
                            <div class="col-md-4 fw-bold">Suç Tarihi:</div>
                            <div class="col-md-8">${formatDate(result.suc_tarihi)}</div>
                        </div>
                        <div class="row">
                            <div class="col-md-4 fw-bold">Hükmün Kesinleştiği Tarih:</div>
                            <div class="col-md-8">${formatDate(result.kesinlesme_tarihi)}</div>
                        </div>
                        <div class="row">
                            <div class="col-md-4 fw-bold">Suç Türü:</div>
                            <div class="col-md-8">${result.suc_turu}</div>
                        </div>
                        <div class="row">
                            <div class="col-md-4 fw-bold">Ceza Türü:</div>
                            <div class="col-md-8">${result.ceza_turu}</div>
                        </div>
                        ${result.toplam_ceza_metni ? `
                        <div class="row">
                            <div class="col-md-4 fw-bold">Toplam Ceza:</div>
                            <div class="col-md-8">${result.toplam_ceza_metni}</div>
                        </div>` : ''}
                    </div>

                    <div class="result-section">
                        <h4>İnfaz Hesaplaması</h4>
                        <div class="row">
                            <div class="col-md-4 fw-bold">İnfaz Oranı:</div>
                            <div class="col-md-8">${result.infaz_orani}</div>
                        </div>
                        <div class="row">
                            <div class="col-md-4 fw-bold">Koşullu Salıverilme Süresi:</div>
                            <div class="col-md-8">${result.kosullu_saliverilme_suresi_metni}</div>
                        </div>
                        <div class="row">
                            <div class="col-md-4 fw-bold">Koşullu Salıverilme Tarihi:</div>
                            <div class="col-md-8">${result.kosullu_saliverilme_tarihi || "Hesaplanamadı"}</div>
                        </div>
                        <div class="row">
                            <div class="col-md-4 fw-bold">Denetimli Serbestlik Süresi:</div>
                            <div class="col-md-8">${result.denetimli_serbestlik_suresi_metni}</div>
                        </div>
                        <div class="row">
                            <div class="col-md-4 fw-bold">Denetimli Serbestlik Tarihi:</div>
                            <div class="col-md-8">${result.denetimli_serbestlik_tarihi || "Hesaplanamadı"}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Sonuç bölümünü güncelle
        sonucDiv.innerHTML = html;
        
        // Sonuç bölümüne kaydır
        sonucDiv.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Yardımcı fonksiyonlar
    function validateDate(gun, ay, yil) {
        const g = Number(gun);
        const a = Number(ay);
        const y = Number(yil);
        
        if (isNaN(g) || isNaN(a) || isNaN(y)) {
            return false;
        }
        
        if (g < 1 || g > 31 || a < 1 || a > 12 || y < 1900 || y > 2100) {
            return false;
        }
        
        // Ay bazında gün kontrolü
        const ayGunleri = [0, 31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        
        return g <= ayGunleri[a];
    }
    
    function padZero(num) {
        return num.toString().padStart(2, '0');
    }
    
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
}); 
