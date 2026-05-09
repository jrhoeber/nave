.PHONY: ios ios-hosted android android-hosted start start-hosted

ios-local:
	ENVFILE=.env npm run ios -- --simulator="iPhone 17 Pro"

ios:
	ENVFILE=.env.hosted npm run ios -- --simulator="iPhone 17 Pro"

android:
	ENVFILE=.env npm run android

android-hosted:
	ENVFILE=.env.hosted npm run android

start:
	ENVFILE=.env npm start -- --reset-cache

start-hosted:
	ENVFILE=.env.hosted npm start -- --reset-cache
