import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';


const config = {
    type: Phaser.AUTO,
    width: 576,
    height: 324,
    zoom: 2,
    pixelArt: true,

    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 },
            debug: false
        }
    },
    scene: [GameScene]
};

export default new Phaser.Game(config);