.PHONY: ios ios-hosted android android-hosted start start-hosted

ios-local:
	rm -f /tmp/envfile
	ENVFILE=.env npm run ios -- --simulator="iPhone 17 Pro Max"

ios:
	rm -f /tmp/envfile
	ENVFILE=.env.hosted npm run ios -- --simulator="iPhone 17 Pro"

android:
	rm -f /tmp/envfile
	ENVFILE=.env npm run android

android-hosted:
	rm -f /tmp/envfile
	ENVFILE=.env.hosted npm run android

start:
	rm -f /tmp/envfile
	ENVFILE=.env npm start -- --reset-cache

start-hosted:
	rm -f /tmp/envfile
	ENVFILE=.env.hosted npm start -- --reset-cache
