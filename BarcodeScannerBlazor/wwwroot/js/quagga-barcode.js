// Objeto global para gerenciar o estado do scanner
window.barcodeScanner = {
    dotNetHelper: null,         // Referência para chamar métodos C# a partir do JS
    alreadyDetected: false      // Impede múltiplas detecções
};

// Inicializa a referência para comunicação com Blazor
window.initBarcodeScanner = function (helper) {
    window.barcodeScanner.dotNetHelper = helper;
};

// Inicia a câmera e o QuaggaJS
window.startBarcodeScanner = function () {
    const videoElement = document.getElementById("video-target");
    if (!videoElement) return;

    // Solicita acesso à câmera traseira
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(function (stream) {
            videoElement.srcObject = stream;

            // Configuração do Quagga
            Quagga.init({
                inputStream: {
                    type: "LiveStream",
                    target: videoElement, // Onde o vídeo será exibido
                    constraints: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 }
                    }
                },
                decoder: {
                    readers: ["ean_reader", "ean_8_reader", "upc_reader"] // Tipos de códigos suportados
                },
                locate: true
            }, function (err) {
                if (err) {
                    console.error("Erro ao iniciar Quagga:", err);
                    return;
                }

                Quagga.start();

                // Quando um código é detectado
                Quagga.onDetected(function (result) {
                    if (window.barcodeScanner.alreadyDetected) return;

                    const code = result?.codeResult?.code;
                    if (code && /^\d{8,14}$/.test(code)) {
                        window.barcodeScanner.alreadyDetected = true; // Evita detecções repetidas
                        Quagga.stop(); // Para o scanner
                        videoElement.srcObject.getTracks().forEach(track => track.stop()); // Para o vídeo
                        window.barcodeScanner.dotNetHelper?.invokeMethodAsync("OnBarcodeDetected", code); // Envia para o Blazor
                    }
                });
            });
        })
        .catch(function (err) {
            console.error("Erro ao acessar a câmera: ", err);
        });
};

// Para o scanner e limpa o vídeo
window.stopBarcodeScanner = function () {
    try {
        Quagga.stop(); // Para o Quagga
        Quagga.offDetected(); // Remove o listener
    } catch (e) {
        console.warn("Erro ao parar Quagga:", e);
    }

    const video = document.getElementById("video-target");
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop()); // Para todas as tracks de vídeo
        video.srcObject = null;
    }

    window.barcodeScanner.alreadyDetected = false; // Reseta estado
};
