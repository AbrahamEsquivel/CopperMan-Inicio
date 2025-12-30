import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
    }

    preload() {
        this.load.atlas('soldado', 'assets/soldado.png', 'assets/soldado.json');
        
        // Crear textura para la bala
        let graphics = this.make.graphics({x: 0, y: 0, add: false});
        graphics.fillStyle(0xffff00, 1);
        graphics.fillRect(0, 0, 10, 4);
        graphics.generateTexture('bala', 10, 4);
    }

    create() {
        // Configuración inicial de velocidades
        this.velocidadBala = 900;
        this.velocidadCaminar = 100; // Velocidad al caminar
        this.velocidadCorrer = 250;  // Velocidad al correr
        
        // Sistema de stamina
        this.maxStamina = 100;
        this.stamina = 100;
        this.costoSalto = 20;
        this.costoCorrer = 0.5; // Consumo de stamina al correr
        
        // Crear barra de stamina en la interfaz
        this.barrasUI = this.add.graphics();
        this.barrasUI.setScrollFactor(0); // Fijo en pantalla

        // Mostrar nombres de los frames en la consola para depuración
        const frameNames = this.textures.get('soldado').getFrameNames();
        console.log('Nombres de los frames:', frameNames);

        // Configuración del entorno
        if (this.textures.exists('sky')) {
            this.add.image(400, 300, 'sky');
        } else {
            this.cameras.main.setBackgroundColor('#444444');
        }

        this.plataformas = this.physics.add.staticGroup();
        if (this.textures.exists('suelo')) {
            this.plataformas.create(400, 568, 'suelo').setScale(2).refreshBody();
            this.plataformas.create(600, 400, 'suelo');
        } else {
            const piso = this.add.rectangle(400, 580, 800, 40, 0x00ff00);
            this.physics.add.existing(piso, true);
            this.plataformas.add(piso);
        }

        // Configuración del jugador
        this.jugador = this.physics.add.sprite(100, 450, 'soldado', 'inactivo1');

        this.jugador.setOrigin(0.5, 1); 

        this.jugador.setScale(1); // Escala normal (128px)
        this.jugador.setBounce(0.1);
        this.jugador.setCollideWorldBounds(true);
        this.jugador.body.setSize(40, 60); 

        //(DESPLAZAMIENTO)
        this.jugador.body.setOffset(44, 68);

        this.balas = this.physics.add.group({
            defaultKey: 'bala',
            maxSize: 10
        });

        this.physics.add.collider(this.jugador, this.plataformas);

        // Configuración de controles
        this.teclas = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT // Tecla para correr
        });

        // Crear animaciones del jugador

        // Animación de caminar
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'caminar', 
                start: 1, end: 8, zeroPad: 0, suffix: '' 
            }),
            frameRate: 10,
            repeat: -1
        });

        // Animación de correr
        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'correr', 
                start: 1, end: 8, zeroPad: 0, suffix: '' 
            }),
            frameRate: 14, // Más rápido
            repeat: -1
        });

        // Animación de estar quieto
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'inactivo', 
                start: 1, end: 9, zeroPad: 0, suffix: ''
            }),
            frameRate: 8,
            repeat: -1
        });

        // Animación de disparo
        this.anims.create({
            key: 'shoot',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'disparar',
                start: 1, end: 4, zeroPad: 0, suffix: ''
            }),
            frameRate: 20,
            repeat: 0
        });

        // Evento para controlar el fin de la animación de disparo
        this.jugador.on('animationcomplete-shoot', () => {
            this.isShooting = false;
        });

        // Configurar disparo al hacer clic
        this.input.on('pointerdown', (pointer) => {
            if (this.isShooting) return;
            this.disparar(pointer);
        });
    }

    update() {
        if (!this.jugador) return;

        // Regenerar stamina si no está corriendo ni saltando
        const estaCorriendo = this.teclas.shift.isDown && (this.teclas.left.isDown || this.teclas.right.isDown);
        
        if (!estaCorriendo && this.stamina < this.maxStamina) {
            this.stamina += 0.3; // Velocidad de recuperación
        }

        // Control de movimiento del jugador
        let velocidadActual = this.velocidadCaminar;
        let animacionMovimiento = 'walk';

        // Cambiar a correr si se presiona Shift y hay suficiente stamina
        if (this.teclas.shift.isDown && this.stamina > 0) {
            velocidadActual = this.velocidadCorrer;
            animacionMovimiento = 'run';
            // Consumir stamina al moverse
            if (this.teclas.left.isDown || this.teclas.right.isDown) {
                this.stamina -= this.costoCorrer;
            }
        }

        if (this.teclas.left.isDown) {
            this.jugador.setVelocityX(-velocidadActual);
            this.jugador.setFlipX(true);
        } else if (this.teclas.right.isDown) {
            this.jugador.setVelocityX(velocidadActual);
            this.jugador.setFlipX(false);
        } else {
            this.jugador.setVelocityX(0);
        }

        // Control de salto
        if ((this.teclas.up.isDown || this.teclas.space.isDown) && 
            this.jugador.body.touching.down && 
            this.stamina >= this.costoSalto) {
            
            this.jugador.setVelocityY(-330);
            this.stamina -= this.costoSalto; // Reducir stamina al saltar
        }

        // Actualizar la barra de stamina en la interfaz
        this.actualizarInterfaz();

        // Control de animaciones del jugador
        
        // Animación de disparo
        if (this.isShooting) {
            // Esperar a que termine
        }
        // Animación de movimiento
        else if (this.jugador.body.velocity.x !== 0) {
            this.jugador.anims.play(animacionMovimiento, true); // Puede ser 'walk' o 'run'
        }
        // Animación de estar quieto
        else {
            this.jugador.anims.play('idle', true);
        }
    }

    disparar(pointer) {
        if (pointer.worldX < this.jugador.x) {
            this.jugador.setFlipX(true);
        } else {
            this.jugador.setFlipX(false);
        }
        
        this.isShooting = true;
        this.jugador.anims.play('shoot', true);

        const bala = this.balas.get(this.jugador.x, this.jugador.y);

        if (bala) {
            bala.setActive(true);
            bala.setVisible(true);
            
            // Ajustar la posición de salida de la bala
            const offset = this.jugador.flipX ? -30 : 30;
            bala.setPosition(this.jugador.x + offset, this.jugador.y - 45);

            const angulo = Phaser.Math.Angle.Between(
                this.jugador.x, 
                this.jugador.y, 
                pointer.worldX, 
                pointer.worldY
            );

            bala.setRotation(angulo);
            this.physics.velocityFromRotation(angulo, this.velocidadBala, bala.body.velocity);
            
            this.time.delayedCall(2000, () => {
                bala.setActive(false);
                bala.setVisible(false);
            });
        }
    }

    actualizarInterfaz() {
        this.barrasUI.clear();

        // Fondo de la barra de stamina
        this.barrasUI.fillStyle(0x000000);
        this.barrasUI.fillRect(10, 10, 200, 20);

        // Barra de stamina
        const porcentaje = Math.max(0, this.stamina / this.maxStamina);
        const color = porcentaje > 0.3 ? 0x00ff00 : 0xff0000;
        
        this.barrasUI.fillStyle(color);
        this.barrasUI.fillRect(12, 12, 196 * porcentaje, 16);
    }
}