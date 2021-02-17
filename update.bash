#!/bin/bash

ssh -i ${KEY_PATH} -oStrictHostKeyChecking=no ${SERVER_USER}@${SERVER_ADDRESS} '
cd /home/ubuntu/burger-reviews
git pull
sudo docker stop burger-reviews_burger-reviews_1
sudo docker stop burger-reviews_burger-reviews-redis_1
sudo docker-compose up -d
'