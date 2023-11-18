# Contributing

Thank you for considering contributing to Biblioteca. Feel free to [get in touch](https://matrix.to/#/%23biblioteca:gnome.org).

Please note that we do not support localization at the moment. The GNOME documentation is only available in English and we don't want to mislead users i

## Running from source

The following is the recommended setup:

1. Install [GNOME Builder from Flathub](https://flathub.org/apps/details/org.gnome.Builder)
2. Open Builder and select "Clone Repository..."
3. Clone `https://github.com/workbenchdev/Biblioteca.git` (or your fork)
4. Press the Run ▶ button

Make sure that you're building the development target `app.drey.Biblioteca.Devel`.

If you know what you are doing you can also use VSCode with the extensions recommended in this workspace or anything else you are comfortable with. Don't forget to fetch the submodules.

## Setup

We provide a couple of tools to make the development process pleasant.

- Code formatter that runs automatically on git commit
- Single command to run all the tests locally

```sh
# Ubuntu requirements
# sudo apt install flatpak flatpak-builder nodejs make
# Fedora requirements
# sudo dnf install flatpak flatpak-builder nodejs make

cd Biblioteca
make setup
```

Before submitting a PR, we recommend running tests locally with

```sh
make test
```

## Translations

Biblioteca doesn't currently support translations for its user interface. GNOME documentation is only available in English and we do not want to mislead non-English speakers.

## Maintenance

Notes for maintainers.

### How to release?

```sh
version=1.0
cd Biblioteca # this repo
# update version in meson.build
# add or update the release in data/app.metainfo.xml
git add meson.build data/app.meta.info.xml
git commit -m v$version # it's a convention to prefix version tags with "v"
git push
git tag v$version
git push -u origin v$version

cd ../app.drey.Biblioteca/ # https://github.com/flathub/app.drey.Biblioteca/
git checkout -b v$V # It's not possible to push to master on flathub
cp ../Biblioteca/build-aux/app.drey.Biblioteca.json . # copy the release manifest
# update the commit and tag in the app.drey.Biblioteca.json
cp -r ../Biblioteca/build-aux/modules . # copy the modules
git add .
git commit -m v$version
git push
```

It will trigger a "Test" build on https://buildbot.flathub.org/#/apps/app.drey.Biblioteca

Once the build is successful, you'll be able to test it and merge the PR into main.

It will trigger an "Official" build on https://buildbot.flathub.org/#/apps/app.drey.Biblioteca

It will eventually be published but if you don't want to wait you can login Buildbot, select the "Official" build and click the "Publish" button.

</details>
