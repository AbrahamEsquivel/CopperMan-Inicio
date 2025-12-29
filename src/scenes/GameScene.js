import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
    }

    preload() {
        
        this.load.atlas('soldado', 'assets/soldado.png', 'assets/soldado.json');

    }

   create() {

        // Debug para confirmar
        const frameNames = this.textures.get('soldado').getFrameNames();
        console.log('✅ NOMBRES:', frameNames);

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

        // --- CORRECCIÓN JUGADOR ---

        this.jugador = this.physics.add.sprite(100, 450, 'soldado', 'idle1');
        this.jugador.setScale(.5);
        this.jugador.setBounce(0.2);
        this.jugador.setCollideWorldBounds(true);
        this.jugador.body.setSize(this.jugador.width * 0.5, this.jugador.height); 
        this.jugador.body.setOffset(this.jugador.width * 0.25, 0);

        this.physics.add.collider(this.jugador, this.plataformas);

        this.teclas = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // --- CORRECCIÓN ANIMACIONES ---

        // 1. RUN
        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'run',  
                start: 1,
                end: 8,
                zeroPad: 0,   
                suffix: '' 
            }),
            frameRate: 12,
            repeat: -1
        });

        // 2. IDLE
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'idle', 
                start: 1,
                end: 7,         
                zeroPad: 0,     
                suffix: ''
            }),
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'jump',
                start: 1,
                end: 7,         
                zeroPad: 0,     
                suffix: ''
            }),
            frameRate: 8,
            repeat: -1
        });
    }

    update() {
        if (!this.jugador) return;

        // --- 1. LÓGICA DE MOVIMIENTO (FÍSICAS) ---
        
        // Izquierda / Derecha
        if (this.teclas.left.isDown) {
            this.jugador.setVelocityX(-160);
            this.jugador.setFlipX(true);
        } 
        else if (this.teclas.right.isDown) {
            this.jugador.setVelocityX(160);
            this.jugador.setFlipX(false);
        } 
        else {
            this.jugador.setVelocityX(0);
        }

        // Saltar
        if (this.teclas.up.isDown && this.jugador.body.touching.down) {
            this.jugador.setVelocityY(-330);
        }
        
        // PRIORIDAD 1: ¿Está en el aire?
        if (!this.jugador.body.touching.down) {
            // Reproduce la animación de salto
           
            this.jugador.anims.play('jump', true); 
        }
        // PRIORIDAD 2: Si está en el suelo, ¿se está moviendo?<
        else if (this.jugador.body.velocity.x !== 0) {
            this.jugador.anims.play('run', true);
        }
        // PRIORIDAD 3: Está en el suelo y quieto
        else {
            this.jugador.anims.play('idle', true);
        }
    }
}