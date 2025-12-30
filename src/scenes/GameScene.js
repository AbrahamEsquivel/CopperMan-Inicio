import Phaser from 'phaser';
import { Jugador } from '../entidades/Jugador';
import { Enemigo } from '../entidades/Enemigo';
import { Bala } from '../entidades/Bala';
import { Pickup } from '../entidades/Pickup';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
    }

    // GameScene.js

    preload() {
        this.load.atlas('soldado', 'assets/soldado.png', 'assets/soldado.json');

        this.load.image('bg_cielo', 'assets/Nivel1/fondo_cielo.png'); 
        this.load.image('bg_ruinas', 'assets/Nivel1/fondo_ruinas.png'); 
        this.load.image('bg_juego', 'assets/Nivel1/fondo_juego.png');
        
        // --- 1. Generar Textura de BOTIQUÍN (Cruz Roja) ---
        const graphicsVida = this.make.graphics({ x: 0, y: 0, add: false });
        graphicsVida.fillStyle(0xffffff); // Fondo blanco
        graphicsVida.fillRect(0, 0, 32, 32);
        graphicsVida.fillStyle(0xff0000); // Cruz roja
        graphicsVida.fillRect(12, 4, 8, 24); // Vertical
        graphicsVida.fillRect(4, 12, 24, 8); // Horizontal
        graphicsVida.generateTexture('icono_vida', 32, 32); // <--- ID: 'icono_vida'

        // --- 2. Generar Textura de MUNICIÓN (Caja Verde Militar) ---
        const graphicsAmmo = this.make.graphics({ x: 0, y: 0, add: false });
        graphicsAmmo.fillStyle(0x2d5a27); // Verde oscuro
        graphicsAmmo.fillRect(0, 0, 32, 32);
        graphicsAmmo.fillStyle(0xffff00); // Detalle amarillo (balas)
        graphicsAmmo.fillRect(5, 10, 5, 15);
        graphicsAmmo.fillRect(13, 10, 5, 15);
        graphicsAmmo.fillRect(21, 10, 5, 15);
        graphicsAmmo.generateTexture('icono_municion', 32, 32); // <--- ID: 'icono_municion'

        // Textura Bala (que ya tenías)
        let graphics = this.make.graphics({x: 0, y: 0, add: false});
        graphics.fillStyle(0xffff00, 1);
        graphics.fillRect(0, 0, 10, 4);
        graphics.generateTexture('bala', 10, 4);
    }

    create() {
        // --- 1. CONFIGURACIÓN DEL MUNDO (PIXEL ART) ---
        // Ajustamos al alto de tu imagen (324px)
        const altoMundo = 324; 
        const anchoMundo = 3000; 

        this.physics.world.setBounds(0, 0, anchoMundo, altoMundo);
        this.cameras.main.setBounds(0, 0, anchoMundo, altoMundo);

        // --- 2. FONDOS ---
        // Cielo (Capa 1 - Fondo)
        this.bgCielo = this.add.tileSprite(0, 0, anchoMundo, altoMundo, 'bg_cielo')
            .setOrigin(0, 0)
            .setScrollFactor(0.1);

        // Ruinas (Capa 2 - Medio)
        this.bgRuinas = this.add.tileSprite(0, 0, anchoMundo, altoMundo, 'bg_ruinas')
            .setOrigin(0, 0)
            .setScrollFactor(0.5);

        // Juego (Capa 3 - Frente)
        // Importante: Ponemos el origen en 0,0 para que empiece arriba a la izquierda
        this.bgJuego = this.add.image(0, 0, 'bg_juego')
            .setOrigin(0, 0)
            .setScrollFactor(1);

        // --- 3. PLATAFORMAS ---
        this.plataformas = this.physics.add.staticGroup();

        // A) SUELO INVISIBLE (Fundamental)
        // La Y ahora es 314 (324 altura total - 10px margen)
        // El ancho cubre todo el nivel (3000)
        const suelo = this.add.rectangle(anchoMundo / 2, 314, anchoMundo, 20, 0x00ff00, 0.5); 
        this.physics.add.existing(suelo, true);
        this.plataformas.add(suelo);

        // B) PLATAFORMAS FLOTANTES
        // Ajustadas a la nueva altura. Antes Y=450, ahora Y=200 aprox.
        this.crearPlataformaInvisible(800, 200, 150, 10);  // Ejemplo Ala de avión
        this.crearPlataformaInvisible(1200, 150, 100, 10); // Ejemplo Caja alta

        // --- 4. GRUPOS ---
        this.grupoBalas = this.physics.add.group({
            classType: Bala,
            runChildUpdate: true
        });
        
        this.enemigos = this.physics.add.group();
        this.pickups = this.physics.add.group();

        // --- 5. JUGADOR ---
        // Spawn ajustado: X=50, Y=200 (para que caiga al suelo)
        this.jugador = new Jugador(this, 50, 200); 
        
        this.cameras.main.startFollow(this.jugador, true, 0.1, 0.1);
        
        // COLISIONES FÍSICAS
        this.physics.add.collider(this.jugador, this.plataformas);
        this.physics.add.collider(this.enemigos, this.plataformas);
        this.physics.add.collider(this.pickups, this.plataformas);

        // --- 6. CONTROLES ---
        this.teclas = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            recargar: Phaser.Input.Keyboard.KeyCodes.R
        });
        this.jugador.asignarControles(this.teclas);

        // DISPARO
        this.input.on('pointerdown', (pointer) => {
            this.jugador.disparar(pointer, this.grupoBalas);
        });

        // --- 7. LÓGICA DE JUEGO (Colisiones) ---
        
        // Balas vs Enemigos
        this.physics.add.overlap(this.grupoBalas, this.enemigos, (bala, enemigo) => {
            if (bala.deactivate) bala.deactivate(); else bala.destroy();
            enemigo.recibirDaño();
        });

        // Jugador vs Enemigos
        this.physics.add.collider(this.jugador, this.enemigos, (jugador, enemigo) => {
            jugador.recibirDaño(enemigo);
        });

        // Recoger Loot
        this.physics.add.overlap(this.jugador, this.pickups, (jugador, pickup) => {
            this.recogerPickup(jugador, pickup);
        });

        // --- 8. UI Y SYSTEMAS ---
        this.crearInterfaz();
        this.crearAnimaciones();
        
        // Iniciamos spawners (Revisa el método abajo, también corregí las alturas)
        this.iniciarSpawners();
    }

    update(time, delta) {
        if(this.jugador) this.jugador.update();
        
        this.enemigos.children.iterate(e => {
            if(e) e.update(this.jugador);
        });

        this.actualizarInterfaz();
        
        // Parallax horizontal infinito (opcional)
        this.bgCielo.tilePositionX = this.cameras.main.scrollX * 0.1;
        this.bgRuinas.tilePositionX = this.cameras.main.scrollX * 0.5;
    }

    // --- MÉTODOS AUXILIARES CORREGIDOS ---

    crearPlataformaInvisible(x, y, ancho, alto) {
        // Cambia el 0 por 0.5 si quieres verlas para depurar
        const plat = this.add.rectangle(x, y, ancho, alto, 0x0000ff, 0.5); 
        this.physics.add.existing(plat, true);
        this.plataformas.add(plat);
    }

    iniciarSpawners() {
        // 1. Enemigos
        this.time.addEvent({
            delay: 3000,
            loop: true,
            callback: () => {
                const distancia = Phaser.Math.Between(300, 500); // Distancia más corta por la resolución
                const direccion = Phaser.Math.Between(0, 1) ? 1 : -1;
                const x = this.jugador.x + (distancia * direccion);
                
                // ALTURA CORREGIDA: 270 (Cerca del suelo que está en 314)
                if (x > 0 && x < 3000) {
                    const enemigo = new Enemigo(this, x, 270); 
                    this.enemigos.add(enemigo);
                }
            }
        });

        // 2. Loot Inicial
        for(let i=0; i < 8; i++) {
            const x = Phaser.Math.Between(200, 2800);
            // ALTURA CORREGIDA: 250 (Para que caigan al suelo)
            this.spawnPickup(x, 250);
        }
    }

    spawnPickup(x, y) {
         const tipo = Phaser.Math.Between(0, 1) === 0 ? 'ammo' : 'health';
         const item = new Pickup(this, x, y, tipo);
         this.pickups.add(item);
    }

    crearInterfaz() {
        this.barrasUI = this.add.graphics().setScrollFactor(0);
        
        // FUENTE AJUSTADA A '10px' PORQUE LA PANTALLA ES PEQUEÑA
        this.textoMunicion = this.add.text(10, 10, '', {
            fontSize: '10px', 
            fill: '#ffffff', 
            fontFamily: 'Arial',
            resolution: 2 // Para que el texto se vea nítido
        }).setScrollFactor(0);

        this.textoVida = this.add.text(10, 25, '', {
            fontSize: '10px', 
            fill: '#ff0000', 
            fontFamily: 'Arial', 
            fontStyle: 'bold',
            resolution: 2
        }).setScrollFactor(0);
    }

    actualizarInterfaz() {
        const j = this.jugador; 
        this.barrasUI.clear();
        
        // Barra Stamina (Más pequeña)
        this.barrasUI.fillStyle(0x000000);
        this.barrasUI.fillRect(10, 40, 100, 5); // Fondo
        
        const porcentaje = Math.max(0, j.stamina / j.maxStamina);
        const color = porcentaje > 0.3 ? 0x00ff00 : 0xff0000;
        this.barrasUI.fillStyle(color);
        this.barrasUI.fillRect(10, 40, 100 * porcentaje, 5); // Barra

        this.textoMunicion.setText(`BALAS: ${j.municionActual} / ${j.municionMax}`);
        this.textoVida.setText(`VIDA: ${j.vidaActual}`);
    }

    recogerPickup(jugador, pickup) {
         if (pickup.tipo === 'ammo') jugador.recogerMunicion(10);
         else if (pickup.tipo === 'health') jugador.recogerVida(1);
         pickup.destroy();
    }

    crearAnimaciones() {
        // (Aquí pegas todas tus animaciones: walk, run, idle, shoot, reload, dead)
        // Como son globales para el 'soldado', está bien dejarlas en la escena o moverlas a un bootloader.
        this.anims.create({ key: 'walk', frames: this.anims.generateFrameNames('soldado', { prefix: 'caminar', start: 1, end: 8, zeroPad: 0 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'run', frames: this.anims.generateFrameNames('soldado', { prefix: 'correr', start: 1, end: 8, zeroPad: 0 }), frameRate: 14, repeat: -1 });
        this.anims.create({ key: 'idle', frames: this.anims.generateFrameNames('soldado', { prefix: 'inactivo', start: 1, end: 9, zeroPad: 0 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'shoot', frames: this.anims.generateFrameNames('soldado', { prefix: 'disparar', start: 1, end: 4, zeroPad: 0 }), frameRate: 20, repeat: 0 });
        this.anims.create({ key: 'reload', frames: this.anims.generateFrameNames('soldado', { prefix: 'recargar', start: 1, end: 7, zeroPad: 0 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'dead', frames: this.anims.generateFrameNames('soldado', { prefix: 'muerte', start: 1, end: 4, zeroPad: 0 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'heal', frames: this.anims.generateFrameNames('soldado', { prefix: 'curar', start: 1, end: 12, zeroPad: 0 }), frameRate: 10, repeat: 0 });
    }
}