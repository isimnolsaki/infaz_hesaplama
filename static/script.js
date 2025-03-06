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
            cezaSuresiDiv.style.display = 'flex';
            document.getElementById('cezaYil').required = true;
            document.getElementById('cezaAy').required = true;
        } else {
            cezaSuresiDiv.style.display = 'none';
            document.getElementById('cezaYil').required = false;
            document.getElementById('cezaAy').required = false;
        }
        // Parent window'a bilgi gönder
        window.parent.postMessage('cezaTuruChanged', '*');
    });

    // Parent window'dan gelen mesajları dinle
    window.addEventListener('message', function(event) {
        if (event.data === 'checkCezaTuru') {
            const cezaTuru = cezaTuruSelect.value;
            if (cezaTuru === 'Süreli Hapis') {
                cezaSuresiDiv.style.display = 'flex';
                document.getElementById('cezaYil').required = true;
                document.getElementById('cezaAy').required = true;
            }
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
        let cezaYil = document.getElementById('cezaYil').value || "0";
        let cezaAy = document.getElementById('cezaAy').value || "0";
        
        if (cezaTuru === 'Süreli Hapis') {
            if (parseInt(cezaYil) === 0 && parseInt(cezaAy) === 0) {
                alert('Lütfen ceza süresini girin.');
                return;
            }
        } else {
            cezaYil = "0";
            cezaAy = "0";
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

        // API'ye istek gönder
        fetch('/hesapla', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            // Sonuçları göster
            let sonucHTML = '';
            
            if (data.error) {
                sonucHTML = `<div class="alert alert-danger">${data.error}</div>`;
            } else {
                sonucHTML = `
                    <div class="card">
                        <div class="card-header">
                            <h4 class="mb-0">İnfaz Hesaplama Sonuçları</h4>
                        </div>
                        <div class="card-body">
                            <div class="result-section">
                                <h4>Genel Bilgiler</h4>
                                <p><strong>Suç Tarihi:</strong> ${formatDate(data.suc_tarihi)}</p>
                                <p><strong>Hükmün Kesinleştiği Tarih:</strong> ${formatDate(data.kesinlesme_tarihi)}</p>
                                <p><strong>Ceza Türü:</strong> ${data.ceza_turu}</p>
                                <p><strong>Suç Türü:</strong> ${data.suc_turu}</p>
                                ${data.toplam_ceza_metni ? `<p><strong>Toplam Ceza:</strong> ${data.toplam_ceza_metni}</p>` : ''}
                            </div>
                            
                            <div class="result-section">
                                <h4>İnfaz Hesaplaması</h4>
                                <p><strong>İnfaz Oranı:</strong> ${data.infaz_orani}</p>
                                <p><strong>Koşullu Salıverilme Süresi:</strong> ${data.kosullu_saliverilme_suresi_metni}</p>
                                <p><strong>Koşullu Salıverilme Tarihi:</strong> ${data.kosullu_saliverilme_tarihi}</p>
                            </div>
                            
                            <div class="result-section">
                                <h4>Denetimli Serbestlik</h4>
                                <p><strong>Denetimli Serbestlik Süresi:</strong> ${data.denetimli_serbestlik_suresi_metni}</p>
                                <p><strong>Denetimli Serbestlik Tarihi:</strong> ${data.denetimli_serbestlik_tarihi}</p>
                            </div>
                            
                            ${data.aciklamalar && data.aciklamalar.length > 0 ? `
                                <div class="result-section">
                                    <h4>Önemli Notlar</h4>
                                    <ul>
                                        ${data.aciklamalar.map(aciklama => `<li>${aciklama}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
            
            sonucDiv.innerHTML = sonucHTML;
            
            // Hesapla butonunu tekrar aktif et
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            
            // Sonuç bölümüne kaydır
            sonucDiv.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            console.error('Hata:', error);
            sonucDiv.innerHTML = '<div class="alert alert-danger">Hesaplama sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.</div>';
            
            // Hesapla butonunu tekrar aktif et
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        });
    });
    
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