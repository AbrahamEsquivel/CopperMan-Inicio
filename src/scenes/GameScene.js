import Phaser from 'phaser';
import { Jugador } from '../entidades/Jugador';
import { Enemigo } from '../entidades/Enemigo';
import { Bala } from '../entidades/Bala';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
    }

    preload() {
        this.load.atlas('soldado', 'assets/soldado.png', 'assets/soldado.json');
        
        // Textura Bala
        let graphics = this.make.graphics({x: 0, y: 0, add: false});
        graphics.fillStyle(0xffff00, 1);
        graphics.fillRect(0, 0, 10, 4);
        graphics.generateTexture('bala', 10, 4);
    }

    create() {

        this.time.addEvent({
            delay: 2000, 
            callback: this.spawnEnemigo,
            callbackScope: this,
            loop: true
        });

        // --- GRUPO DE BALAS ---
        // Aquí está la magia: classType y runChildUpdate
        this.grupoBalas = this.physics.add.group({
            classType: Bala,       // Usar nuestra clase personalizada
            runChildUpdate: true,  // Permitir que las balas ejecuten su método update()
            maxSize: 30            // Opcional: Límite de balas en pantalla
        });

        // (Jugador se creará más abajo una vez estén las plataformas)

        // --- 1. MUNDO Y CÁMARA ---
        this.physics.world.setBounds(0, 0, 2000, 600);
        this.cameras.main.setBounds(0, 0, 2000, 600);

        // Fondo
        if (this.textures.exists('sky')) {
            this.add.image(400, 300, 'sky').setScrollFactor(0); // Fondo fijo o parallax simple
        } else {
            this.cameras.main.setBackgroundColor('#444444');
        }

        // --- 2. PLATAFORMAS ---
        this.plataformas = this.physics.add.staticGroup();
        if (this.textures.exists('suelo')) {
            this.plataformas.create(400, 568, 'suelo').setScale(2).refreshBody();
            this.plataformas.create(600, 400, 'suelo');
        } else {
            const piso = this.add.rectangle(400, 580, 800, 40, 0x00ff00);
            this.physics.add.existing(piso, true);
            this.plataformas.add(piso);
        }

        // --- 3. JUGADOR ---
        // Instanciamos la clase Jugador
        this.jugador = new Jugador(this, 100, 450);
        this.cameras.main.startFollow(this.jugador);
        this.physics.add.collider(this.jugador, this.plataformas);

        // Controles
        this.teclas = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            recargar: Phaser.Input.Keyboard.KeyCodes.R
        });
        // Le pasamos las teclas al jugador para que él se mueva
        this.jugador.asignarControles(this.teclas);

        // --- 4. ENEMIGOS ---
        this.enemigos = this.physics.add.group();
        this.physics.add.collider(this.enemigos, this.plataformas);

        // Spawn inicial de prueba (Usando la nueva clase Enemigo)
        const zombi = new Enemigo(this, 600, 450);
        this.enemigos.add(zombi); // Agregarlo al grupo para colisiones

        // --- 5. BALAS ---
        this.input.on('pointerdown', (pointer) => {
            this.jugador.disparar(pointer, this.grupoBalas);
        });

        // --- 6. COLISIONES (LÓGICA DE JUEGO) ---

        // A) Balas vs Enemigos
        this.physics.add.overlap(this.grupoBalas, this.enemigos, (bala, enemigo) => {
            // 1. Apagar bala
            if (bala.deactivate) bala.deactivate(); else bala.destroy();

            // 2. Calcular empuje (La bala empuja al enemigo hacia atrás)
            const direccionEmpuje = bala.x < enemigo.x ? 1 : -1;
            
            // Si el enemigo sigue vivo, lo empujamos
            if (!enemigo.isDead) {
                enemigo.setVelocityX(150 * direccionEmpuje);
                enemigo.setVelocityY(-100); // Un saltito pequeño al recibir el impacto
            }

            // 3. Aplicar daño
            enemigo.recibirDaño();
        });

        // B) Jugador vs Enemigos
        this.physics.add.collider(this.jugador, this.enemigos, (jugador, enemigo) => {
            // Llamamos al método recibirDaño DEL JUGADOR
            jugador.recibirDaño(enemigo);
        });

        // --- 7. INTERFAZ (UI) ---
        this.crearInterfaz();
        
        // --- 8. ANIMACIONES GLOBALES ---
        this.crearAnimaciones();
    }

    update(time, delta) {
        if (!this.jugador) return;

        // 1. Actualizar Jugador (Él gestiona su movimiento, recarga, etc.)
        this.jugador.update();

        // Disparo gestionado por `pointerdown` (solo ratón)
        
        // 2. Actualizar Enemigos (IA)
        this.enemigos.children.iterate((enemigo) => {
            if (enemigo) {
                enemigo.update(this.jugador);
            }
        });

        // 3. Actualizar UI (Leemos los datos del jugador)
        this.actualizarInterfaz();
    }

    // --- FUNCIONES AUXILIARES DE ESCENA ---

    crearInterfaz() {
        this.barrasUI = this.add.graphics().setScrollFactor(0);
        
        this.textoMunicion = this.add.text(12, 40, '', {
            fontSize: '20px', fill: '#ffffff', fontFamily: 'Arial'
        }).setScrollFactor(0);

        this.textoVida = this.add.text(12, 70, '', {
            fontSize: '20px', fill: '#ff0000', fontFamily: 'Arial', fontStyle: 'bold'
        }).setScrollFactor(0);
    }

    actualizarInterfaz() {
        // Leemos las propiedades públicas del jugador
        const j = this.jugador; 

        // Barra Stamina
        this.barrasUI.clear();
        this.barrasUI.fillStyle(0x000000);
        this.barrasUI.fillRect(10, 10, 200, 20);
        
        const porcentaje = Math.max(0, j.stamina / j.maxStamina);
        const color = porcentaje > 0.3 ? 0x00ff00 : 0xff0000;
        this.barrasUI.fillStyle(color);
        this.barrasUI.fillRect(12, 12, 196 * porcentaje, 16);

        // Textos
        this.textoMunicion.setText(`BALAS: ${j.municionActual} / ${j.municionMax}`);
        this.textoVida.setText(`VIDA: ${j.vidaActual}`);
    }

    spawnEnemigo() {
        // 1. Elegir un lado de la pantalla aleatorio (Izquierda o Derecha)
        // El jugador está en this.jugador.x
        // Queremos que aparezcan fuera de cámara, p.ej. a 500px de distancia
        
        const distanciaSpawn = 500;
        const direccion = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
        const x = this.jugador.x + (distanciaSpawn * direccion);
        
        // Altura (asumiendo suelo plano en y=450, ajusta a tus plataformas)
        const y = 450; 
        
        // Crear enemigo
        const enemigo = new Enemigo(this, x, y);
        this.enemigos.add(enemigo); // Agregarlo al grupo físico
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
    }
}